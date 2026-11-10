// ═══════════════════════════════════════════════
// SALVAR DESPESA (nova ou edição)
// ═══════════════════════════════════════════════
// Regra de ouro: editar uma despesa recorrente NUNCA cria outra despesa.
//  - "Todos os meses"  → altera o registro (só os campos que você mudou)
//  - "Só este mês"     → grava uma exceção em exp.overrides[mês]
async function saveExpense() {
  const btnSave = document.getElementById('btnSave');
  if (btnSave.disabled) return; // evita duplo clique

  const desc     = document.getElementById('fDesc').value.trim();
  const valorStr = document.getElementById('fValor').value;
  const valor    = parseBRL(valorStr);
  const data     = document.getElementById('fData').value;
  const nota     = document.getElementById('fNota').value.trim();
  const rateio   = readRateioFromForm();
  const grupoId  = readGrupoIdFromForm();

  const erroNoPasso0 = (id, msg) => {
    if (typeof goToModalStep === 'function') goToModalStep(0);
    const el = document.getElementById(id);
    el.classList.add('error');
    el.focus();
    showToast(msg);
  };
  if (!desc)                { erroNoPasso0('fDesc',  '⚠️ Informe a descrição'); return; }
  if (!valor || valor <= 0) { erroNoPasso0('fValor', '⚠️ Informe um valor válido'); return; }
  if (!data)                { erroNoPasso0('fData',  '⚠️ Informe a data'); return; }
  ['fDesc','fValor','fData'].forEach(id => document.getElementById(id).classList.remove('error'));

  const tipo = !repeatOn ? 'unico' : repeatType;
  let totalParcelas = null;
  if (tipo === 'parcelado') {
    totalParcelas = parseInt(document.getElementById('fParcelas').value) || 0;
    if (totalParcelas < 2 || totalParcelas > 60) {
      document.getElementById('fParcelas').classList.add('error');
      showToast('⚠️ Informe entre 2 e 60 parcelas');
      return;
    }
  }
  document.getElementById('fParcelas').classList.remove('error');

  // Parcelado: o valor digitado pode ser da parcela ou do total da compra.
  // No mês, só a PARCELA entra nos totais; o total fica só pra consulta.
  let valorFinal = valor;
  let valorTotal = null;
  if (tipo === 'parcelado') {
    if (parcelaModo === 'total') { valorTotal = round2(valor); valorFinal = round2(valor / totalParcelas); }
    else                         { valorTotal = round2(valor * totalParcelas); }
  }

  const dateObj  = new Date(data + 'T12:00:00');
  const monthKey = getMonthKey(dateObj.getFullYear(), dateObj.getMonth());
  const currentKey = getMonthKey(currentYear, currentMonth);

  let toastMsg = '✅ Despesa adicionada!';
  let idNovo = null;

  if (editingId) {
    const idx = expenses.findIndex(e => e.id === editingId);
    if (idx === -1) return;
    const exp  = expenses[idx];
    const snap = _editSnapshot || {};
    const recorrente = exp.tipo === 'fixo' || exp.tipo === 'parcelado';

    if (!recorrente) {
      // Despesa única (ou virando recorrente agora): substitui normalmente
      expenses[idx] = { ...exp, descricao: desc, valor: valorFinal, dataOriginal: data, categoria: selectedCat,
                        tipo, totalParcelas, monthKey, nota, rateio, grupoId, valorTotal };
      toastMsg = '✏️ Despesa atualizada!';
    } else {
      // O que o usuário realmente mudou
      const changed = {};
      if (desc !== snap.descricao)                          changed.descricao = desc;
      if (valorFinal !== snap.valor)                        changed.valor = valorFinal;
      if (selectedCat !== snap.categoria)                   changed.categoria = selectedCat;
      if (nota !== snap.nota)                               changed.nota = nota;
      if (JSON.stringify(rateio || null) !== snap.rateio)   changed.rateio = rateio || null;

      const mesmoAnoMes = data.slice(0, 7) === (snap.data || '').slice(0, 7);
      const diaMudou    = data !== snap.data && mesmoAnoMes;
      if (diaMudou) changed.dia = parseInt(data.split('-')[2], 10);

      // Mudanças de estrutura (tipo, nº de parcelas, mês de início, grupo) valem sempre pra todos os meses
      const estrutural = tipo !== exp.tipo
        || (tipo === 'parcelado' && (totalParcelas !== exp.totalParcelas))
        || (data !== snap.data && !mesmoAnoMes)
        || (grupoId || null) !== (snap.grupoId || null);

      if (!estrutural && Object.keys(changed).length === 0) {
        closeModal();
        showToast('Nenhuma alteração');
        return;
      }

      let escopo = 'todos';
      if (!estrutural) {
        escopo = await perguntarEscopoEdicao('Esta despesa se repete em vários meses. A alteração vale pra quais?');
        if (!escopo) return;           // cancelou: nada muda, modal continua aberto
      }

      if (escopo === 'mes') {
        const { dia, ...resto } = changed;
        const ov = { ...((exp.overrides || {})[currentKey] || {}), ...resto };
        if (dia !== undefined) ov.dia = dia;
        exp.overrides = { ...(exp.overrides || {}), [currentKey]: ov };
        toastMsg = '📌 Alterado só neste mês';
      } else {
        const { dia, ...resto } = changed;
        if (estrutural) {
          // reaplica a edição completa preservando as exceções já existentes
          Object.assign(exp, { descricao: desc, valor: valorFinal, dataOriginal: data, categoria: selectedCat,
                               tipo, totalParcelas, monthKey, nota, rateio, grupoId, valorTotal });
        } else {
          Object.assign(exp, resto);
          if (dia !== undefined) {
            const p = exp.dataOriginal.split('-');
            exp.dataOriginal = `${p[0]}-${p[1]}-${String(dia).padStart(2, '0')}`;
          }
          if (resto.valor !== undefined && exp.tipo === 'parcelado') {
            exp.valorTotal = valorTotal != null && parcelaModo === 'total' ? valorTotal : round2(exp.valor * exp.totalParcelas);
          }
        }
        // a edição "para todos" vale também aqui: remove a exceção do mês nos campos alterados
        const ovAtual = exp.overrides?.[currentKey];
        if (ovAtual) {
          Object.keys(changed).forEach(k => delete ovAtual[k]);
          if (Object.keys(ovAtual).length === 0) delete exp.overrides[currentKey];
        }
        toastMsg = '✏️ Despesa atualizada em todos os meses!';
      }
    }
  } else {
    idNovo = String(Date.now()) + Math.random().toString(36).slice(2,7);
    expenses.push({
      id: idNovo,
      descricao: desc, valor: valorFinal,
      dataOriginal: data, categoria: selectedCat, tipo, totalParcelas, monthKey,
      pagamentos: {}, nota, rateio, grupoId, valorTotal, user_id: currentUser?.id
    });
  }

  // Desabilita o botão e mostra o spinner só durante a gravação
  const labelOriginal = btnSave.textContent;
  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>Salvando...';

  window._novaDespesaId = idNovo;       // só a despesa nova anima ao aparecer
  await persistExpenses();
  closeModal();
  renderAll();
  showToast(toastMsg);
  window._novaDespesaId = null;
  btnSave.disabled = false;
  btnSave.textContent = labelOriginal;
}
