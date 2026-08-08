async function saveExpense() {
  const btnSave = document.getElementById('btnSave');
  if (btnSave.disabled) return; // evita duplo clique

  const desc     = document.getElementById('fDesc').value.trim();
  const valorStr = document.getElementById('fValor').value;
  const valor    = parseBRL(valorStr);
  const data     = document.getElementById('fData').value;
  const nota     = document.getElementById('fNota').value.trim();

  if (!desc) {
    if (typeof goToModalStep === 'function') goToModalStep(0);
    const el = document.getElementById('fDesc');
    el.classList.add('error');
    el.focus();
    showToast('⚠️ Informe a descrição');
    return;
  }
  if (!valor || valor <= 0) {
    if (typeof goToModalStep === 'function') goToModalStep(0);
    const el = document.getElementById('fValor');
    el.classList.add('error');
    el.focus();
    showToast('⚠️ Informe um valor válido');
    return;
  }
  if (!data) {
    if (typeof goToModalStep === 'function') goToModalStep(0);
    const el = document.getElementById('fData');
    el.classList.add('error');
    el.focus();
    showToast('⚠️ Informe a data');
    return;
  }
  // Limpa marcação de erro
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

  // Desabilita o botão e mostra o spinner durante o processamento assíncrono
  // (importante no modo online/Supabase, onde a gravação depende da rede)
  const labelOriginal = btnSave.textContent;
  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>Salvando...';

  const dateObj  = new Date(data + 'T12:00:00');
  const monthKey = getMonthKey(dateObj.getFullYear(), dateObj.getMonth());

  if (editingId) {
    const idx = expenses.findIndex(e => e.id === editingId);
    if (idx !== -1) {
      const expAntiga = expenses[idx];
      if (expAntiga.tipo === 'fixo' || expAntiga.tipo === 'parcelado') {
        const modoEdicao = await mostrarPopup({
          emoji:  '🔄',
          titulo: 'Como deseja editar?',
          texto:  'Esta é uma despesa recorrente. Você pode alterar todos os meses futuros ou criar uma exceção apenas para o mês atual.',
          botoes: [
            { texto: '🔁 Todos os Meses', classe: 'confirm-btn-primary',   valor: 'todos' },
            { texto: '📌 Só Este Mês',    classe: 'confirm-btn-secondary', valor: 'unico' }
          ]
        });

        if (modoEdicao === 'unico') {
          const currentKey = getMonthKey(currentYear, currentMonth);
          // Monta a data de vencimento no mês atual mantendo o dia da data original do form
          const diaStr = data.split('-')[2] || '01';
          const dataNoMesAtual = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${diaStr}`;
          const novaUnica  = {
            id: String(Date.now()) + Math.random().toString(36).slice(2,7),
            descricao: desc, valor, dataOriginal: dataNoMesAtual,
            categoria: selectedCat, tipo: 'unico', totalParcelas: null,
            monthKey: currentKey, pagamentos: {}, nota
          };
          if (expAntiga.pagamentos?.[currentKey]) {
            novaUnica.pagamentos[currentKey] = expAntiga.pagamentos[currentKey];
          }
          if (!expAntiga.ignorarMeses) expAntiga.ignorarMeses = [];
          if (!expAntiga.ignorarMeses.includes(currentKey)) {
            expAntiga.ignorarMeses.push(currentKey);
          }
          expenses.push(novaUnica);
          showToast('✏️ Alterado apenas para este mês!');
        } else {
          expenses[idx] = { ...expenses[idx], descricao: desc, valor, dataOriginal: data, categoria: selectedCat, tipo, totalParcelas, monthKey, nota };
          showToast('✏️ Despesa global atualizada!');
        }
      } else {
        expenses[idx] = { ...expenses[idx], descricao: desc, valor, dataOriginal: data, categoria: selectedCat, tipo, totalParcelas, monthKey, nota };
        showToast('✏️ Despesa atualizada!');
      }
    }
  } else {
    expenses.push({
      id: String(Date.now()) + Math.random().toString(36).slice(2,7),
      descricao: desc, valor,
      dataOriginal: data, categoria: selectedCat, tipo, totalParcelas, monthKey,
      pagamentos: {}, nota
    });
    // FIX: emoji estava faltando (era apenas um espaço em branco)
    showToast('✅ Despesa adicionada!');
  }

  await persistExpenses();
  closeModal();
  renderAll();
  // Reabilita o botão (caso o modal seja reaberto antes do re-render)
  btnSave.disabled = false;
  btnSave.textContent = labelOriginal;
}

// ═══════════════════════════════════════════════
