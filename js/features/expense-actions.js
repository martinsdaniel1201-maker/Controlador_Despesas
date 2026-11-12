// MENU DE AÇÕES DO ITEM (kebab) — abre/fecha o popover com
// Editar/Duplicar/Excluir/Marcar como pago, no lugar da barra
// de 4 botões que ficava sempre visível.
// ═══════════════════════════════════════════════
function closeItemMenus() {
  document.querySelectorAll('.item-menu.open').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.item-menu-btn.open').forEach(b => b.classList.remove('open'));
  // O card (.swipe-wrapper) usa overflow:hidden pra manter as bordas
  // arredondadas — sem tirar isso durante a abertura, o popover fica
  // recortado e parece que "não aparece".
  document.querySelectorAll('.swipe-wrapper.menu-open').forEach(w => w.classList.remove('menu-open'));
}

function toggleItemMenu(event, id) {
  event.preventDefault();
  const menu = document.getElementById(`menu-${id}`);
  const btn  = event.currentTarget;
  const wrapper = menu.closest('.swipe-wrapper');
  const wasOpen = menu.classList.contains('open');
  closeItemMenus();
  if (!wasOpen) {
    menu.classList.add('open');
    btn.classList.add('open');
    if (wrapper) wrapper.classList.add('menu-open');
  }
}

// Fecha qualquer menu aberto ao tocar fora dele
document.addEventListener('click', (e) => {
  if (!e.target.closest('.item-menu') && !e.target.closest('.item-menu-btn')) {
    closeItemMenus();
  }
});

// ═══════════════════════════════════════════════
// DUPLICAR DESPESA (#6)
// ═══════════════════════════════════════════════
function duplicateExpense(id) {
  const orig = expenses.find(e => e.id === id);
  if (!orig) return;
  const d = getDisplayExpense(orig, currentYear, currentMonth); // valores do mês exibido (com exceções)
  // Avança para o próximo mês
  let nm = currentMonth + 1, ny = currentYear;
  if (nm > 11) { nm = 0; ny++; }
  const nextMonthStr = `${ny}-${String(nm+1).padStart(2,'0')}`;
  const novaData = `${ny}-${String(nm+1).padStart(2,'0')}-${orig.dataOriginal.split('-')[2]}`;
  const nova = {
    id: String(Date.now()) + Math.random().toString(36).slice(2,7),
    descricao: d.descricao,
    valor: d.valorBruto,
    dataOriginal: novaData,
    categoria: d.categoria || 'outros',
    tipo: 'unico',
    totalParcelas: null,
    monthKey: nextMonthStr,
    pagamentos: {},
    nota: d.nota || '',
    rateio: d.rateio || null,
    grupoId: orig.grupoId || null,
    user_id: currentUser?.id
  };
  expenses.push(nova);
  save();
  renderAll();
  showToast(`📋 Duplicado para ${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][nm]}/${ny}!`);
}

// Pergunta se a alteração vale pra todos os meses ou só pro mês exibido.
// Retorna 'todos' | 'mes' | false (cancelou). Nunca cria despesa nova.
async function perguntarEscopoEdicao(textoExtra) {
  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesLabel = `${nomesMeses[currentMonth]}/${currentYear}`;
  return mostrarPopup({
    emoji:  '🔄',
    titulo: 'Onde aplicar a alteração?',
    texto:  textoExtra || 'Esta despesa se repete em vários meses.',
    botoes: [
      { texto: '🔁 Todos os meses',        classe: 'confirm-btn-primary',   valor: 'todos' },
      { texto: `📌 Só ${mesLabel}`,        classe: 'confirm-btn-secondary', valor: 'mes'   },
      { texto: 'Cancelar',                 classe: 'confirm-btn-secondary', valor: false   }
    ]
  });
}

// ═══════════════════════════════════════════════
// INLINE EDIT VALOR (#4)
// ═══════════════════════════════════════════════
function openInlineEdit(event, id) {
  event.preventDefault();
  event.stopPropagation();
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  inlineEditId = id;
  const d = getDisplayExpense(exp, currentYear, currentMonth);
  const overlay = document.getElementById('inlineEditOverlay');
  const input   = document.getElementById('inlineEditInput');
  input.value   = d.valorBruto.toFixed(2).replace('.', ',');
  overlay.classList.add('open');
  setTimeout(() => { input.focus(); input.select(); }, 100);
}

function closeInlineEdit(event) {
  if (event && event.target !== document.getElementById('inlineEditOverlay')) return;
  document.getElementById('inlineEditOverlay').classList.remove('open');
  inlineEditId = null;
}

function cancelInlineEdit() {
  document.getElementById('inlineEditOverlay').classList.remove('open');
  inlineEditId = null;
}

async function confirmInlineEdit() {
  if (!inlineEditId) return;
  const raw   = document.getElementById('inlineEditInput').value;
  const valor = parseBRL(raw);
  if (!valor || valor <= 0) { showToast('⚠️ Valor inválido'); return; }
  const exp = expenses.find(e => e.id === inlineEditId);
  const idEdit = inlineEditId;
  document.getElementById('inlineEditOverlay').classList.remove('open');
  inlineEditId = null;
  if (!exp) return;

  let escopo = 'todos';
  if (exp.tipo === 'fixo' || exp.tipo === 'parcelado') {
    escopo = await perguntarEscopoEdicao('Você alterou o valor de uma despesa recorrente.');
    if (!escopo) return;
  }
  if (escopo === 'mes') {
    const key = getMonthKey(currentYear, currentMonth);
    exp.overrides = { ...(exp.overrides || {}), [key]: { ...((exp.overrides || {})[key] || {}), valor } };
  } else {
    exp.valor = valor;
    if (exp.tipo === 'parcelado') exp.valorTotal = round2(valor * (exp.totalParcelas || 0));
    const key = getMonthKey(currentYear, currentMonth);
    if (exp.overrides?.[key]) delete exp.overrides[key].valor;
  }
  await persistExpenses();
  renderAll();
  showToast('✏️ Valor atualizado!');
}

// ═══════════════════════════════════════════════
// AÇÕES: TOGGLE, DELETE, EDIT, PAY ALL
// ═══════════════════════════════════════════════
function togglePay(id, monthKey) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  if (!exp.pagamentos) exp.pagamentos = {};
  exp.pagamentos[monthKey] = !exp.pagamentos[monthKey];
  save();
  renderAll();
  showToast(exp.pagamentos[monthKey] ? '✅ Marcado como pago!' : '↩ Marcado como pendente');
}

// NOVO: marcar todas as despesas pendentes do mês como pagas
async function payAll() {
  const key     = getMonthKey(currentYear, currentMonth);
  const raw     = getMonthExpenses(currentYear, currentMonth);
  const pending = raw.filter(e => !(e.pagamentos || {})[key]);

  if (pending.length === 0) { showToast('✅ Todas já estão pagas!'); return; }

  const confirmar = await mostrarPopup({
    emoji:  '✅',
    titulo: 'Marcar todas como pagas?',
    texto:  `${pending.length} despesa(s) pendente(s) serão marcadas como pagas neste mês.`,
    botoes: [
      { texto: 'Sim, Pagar Tudo', classe: 'confirm-btn-primary',   valor: true  },
      { texto: 'Cancelar',        classe: 'confirm-btn-secondary',  valor: false }
    ]
  });

  if (!confirmar) return;
  pending.forEach(e => {
    if (!e.pagamentos) e.pagamentos = {};
    e.pagamentos[key] = true;
  });
  save();
  renderAll();
  showToast(`✅ ${pending.length} despesa(s) marcadas como pagas!`);
  fireConfetti(30);
}

async function deleteExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;

  const recorrente = exp.tipo === 'fixo' || exp.tipo === 'parcelado';
  let escopo = 'todos'; // 'mes' = só o mês exibido | 'todos' = remove o registro inteiro

  if (recorrente) {
    const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const mesLabel   = `${nomesMeses[currentMonth]}/${currentYear}`;
    const ehParcelado = exp.tipo === 'parcelado';
    escopo = await mostrarPopup({
      emoji:  '🗑️',
      titulo: 'Como deseja excluir?',
      texto:  ehParcelado
        ? `Esta despesa é parcelada. Você pode excluir apenas a parcela de ${mesLabel} ou todas as parcelas.`
        : `Esta despesa é fixa. Você pode excluir apenas em ${mesLabel} ou em todos os meses.`,
      botoes: [
        { texto: '📌 Só este mês',                                   classe: 'confirm-btn-primary',   valor: 'mes'   },
        { texto: ehParcelado ? '🗑 Todas as parcelas' : '🗑 Todos os meses', classe: 'confirm-btn-danger', valor: 'todos' },
        { texto: 'Cancelar',                                         classe: 'confirm-btn-secondary', valor: false   }
      ]
    });
    if (!escopo) return;
  } else {
    const confirmar = await mostrarPopup({
      emoji:  '🗑️',
      titulo: 'Excluir despesa?',
      texto:  'Tem certeza de que deseja apagar permanentemente este registro?',
      botoes: [
        { texto: 'Sim, Excluir', classe: 'confirm-btn-danger',    valor: true  },
        { texto: 'Cancelar',     classe: 'confirm-btn-secondary', valor: false }
      ]
    });
    if (!confirmar) return;
  }

  const finish = () => {
    if (escopo === 'mes') {
      // Exclusão só deste mês: o registro continua existindo nos outros meses,
      // apenas marca o mês atual como ignorado (persistido no Supabase).
      const key = getMonthKey(currentYear, currentMonth);
      if (!exp.ignorarMeses) exp.ignorarMeses = [];
      if (!exp.ignorarMeses.includes(key)) exp.ignorarMeses.push(key);
      save();
      renderAll();
      showToast('🗑 Excluída apenas neste mês');
    } else {
      expenses = expenses.filter(e => e.id !== id);
      save();
      deleteFromSupabase(id);
      renderAll();
      showToast('🗑 Despesa excluída');
    }
  };

  const el = document.querySelector(`.swipe-wrapper[data-expid="${id}"]`);
  if (el) {
    el.style.maxHeight = el.scrollHeight + 'px';
    void el.offsetHeight; // força o navegador a fixar o valor antes de animar
    el.classList.add('item-removing');
    requestAnimationFrame(() => { el.style.maxHeight = '0px'; });
    setTimeout(finish, 340);
  } else {
    finish();
  }
}

// Foto do que foi carregado no formulário — usada pra saber o que o usuário
// REALMENTE mudou (e só aplicar isso), em vez de regravar tudo.
let _editSnapshot = null;

function editExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  editingId = id;
  // O formulário abre com os valores do mês que está na tela (com exceções)
  const d = getDisplayExpense(exp, currentYear, currentMonth);
  const ov = getOverride(exp, getMonthKey(currentYear, currentMonth)) || {};
  document.getElementById('modalTitle').textContent = 'Editar Despesa';
  setModalSaveLabel('💾 Salvar Alterações');
  document.getElementById('fDesc').value            = d.descricao;
  const valorFormatado = d.valorBruto.toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  document.getElementById('fValor').value           = valorFormatado;
  let dataForm = exp.dataOriginal;
  if (ov.dia) { const p = exp.dataOriginal.split('-'); dataForm = `${p[0]}-${p[1]}-${String(ov.dia).padStart(2,'0')}`; }
  document.getElementById('fData').value            = dataForm;
  document.getElementById('fNota').value            = d.nota || '';
  loadShareIntoForm(d.rateio || null, exp.grupoId || null);
  selectedCat = d.categoria || 'outros';
  _catUserPicked = true;
  repeatOn    = exp.tipo !== 'unico';
  repeatType  = exp.tipo === 'parcelado' ? 'parcelado' : 'fixo';

  const toggle = document.getElementById('toggleRepetir');
  toggle.className = 'toggle' + (repeatOn ? ' on' : '');
  toggle.setAttribute('aria-checked', String(repeatOn));
  document.getElementById('repeatOptions').style.display = repeatOn ? 'block' : 'none';

  updateRadios();
  renderCatChips();
  document.getElementById('parcelasRow').style.display = repeatType === 'parcelado' ? 'flex' : 'none';
  document.getElementById('parcelaModoRow').style.display = (repeatOn && repeatType === 'parcelado') ? 'block' : 'none';
  setParcelaModo('parcela');
  if (exp.totalParcelas) document.getElementById('fParcelas').value = exp.totalParcelas;
  ['fDesc','fValor','fData','fParcelas'].forEach(id => document.getElementById(id).classList.remove('error'));

  _editSnapshot = {
    descricao: d.descricao, valor: d.valorBruto, categoria: d.categoria || 'outros',
    nota: d.nota || '', rateio: canonRateio(d.rateio),
    data: dataForm, grupoId: exp.grupoId || null
  };

  updateParcelaPreview();
  openModal();
}

