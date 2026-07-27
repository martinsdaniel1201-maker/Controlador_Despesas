// DUPLICAR DESPESA (#6)
// ═══════════════════════════════════════════════
function duplicateExpense(id) {
  const orig = expenses.find(e => e.id === id);
  if (!orig) return;
  // Avança para o próximo mês
  let nm = currentMonth + 1, ny = currentYear;
  if (nm > 11) { nm = 0; ny++; }
  const nextMonthStr = `${ny}-${String(nm+1).padStart(2,'0')}`;
  const novaData = `${ny}-${String(nm+1).padStart(2,'0')}-${orig.dataOriginal.split('-')[2]}`;
  const nova = {
    id: Date.now().toString(),
    descricao: orig.descricao,
    valor: orig.valor,
    dataOriginal: novaData,
    categoria: orig.categoria || 'outros',
    tipo: 'unico',
    totalParcelas: null,
    monthKey: nextMonthStr,
    pagamentos: {},
    nota: orig.nota || ''
  };
  expenses.push(nova);
  save();
  renderAll();
  showToast(`📋 Duplicado para ${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][nm]}/${ny}!`);
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
  const overlay = document.getElementById('inlineEditOverlay');
  const input   = document.getElementById('inlineEditInput');
  input.value   = exp.valor.toFixed(2).replace('.', ',');
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

function confirmInlineEdit() {
  if (!inlineEditId) return;
  const raw   = document.getElementById('inlineEditInput').value;
  const valor = parseBRL(raw);
  if (!valor || valor <= 0) { showToast('⚠️ Valor inválido'); return; }
  const exp = expenses.find(e => e.id === inlineEditId);
  if (exp) { exp.valor = valor; save(); renderAll(); showToast('✏️ Valor atualizado!'); }
  document.getElementById('inlineEditOverlay').classList.remove('open');
  inlineEditId = null;
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
}

async function deleteExpense(id) {
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
  expenses = expenses.filter(e => e.id !== id);
  save();
  renderAll();
  showToast('🗑 Despesa excluída');
}

function editExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Editar Despesa';
  document.getElementById('btnSave').textContent = '💾 Salvar Alterações';
  document.getElementById('fDesc').value            = exp.descricao;
  // Aplica formato de máscara corretamente (ex: 1.234,56)
  const valorFormatado = exp.valor.toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  document.getElementById('fValor').value           = valorFormatado;
  document.getElementById('fData').value            = exp.dataOriginal;
  document.getElementById('fNota').value            = exp.nota || '';
  selectedCat = exp.categoria || 'outros';
  repeatOn    = exp.tipo !== 'unico';
  repeatType  = exp.tipo === 'parcelado' ? 'parcelado' : 'fixo';

  const toggle = document.getElementById('toggleRepetir');
  toggle.className = 'toggle' + (repeatOn ? ' on' : '');
  toggle.setAttribute('aria-checked', String(repeatOn));
  document.getElementById('repeatOptions').style.display = repeatOn ? 'block' : 'none';

  updateRadios();
  renderCatChips();
  document.getElementById('parcelasRow').style.display = repeatType === 'parcelado' ? 'flex' : 'none';
  if (exp.totalParcelas) document.getElementById('fParcelas').value = exp.totalParcelas;
  ['fDesc','fValor','fData','fParcelas'].forEach(id => document.getElementById(id).classList.remove('error'));

  openModal();
}

// ═══════════════════════════════════════════════
