// MODAL
// ═══════════════════════════════════════════════
const MODAL_STEP_COUNT = 3;
let _modalStep = 0;
let _modalSaveLabel = '✅ Adicionar Despesa';

function setModalSaveLabel(text) {
  _modalSaveLabel = text;
  if (_modalStep === MODAL_STEP_COUNT - 1) {
    document.getElementById('btnSave').textContent = text;
  }
}

function openModal(reset = false) {
  if (!editingId || reset) {
    editingId   = null;
    repeatOn    = false;
    repeatType  = 'fixo';
    selectedCat = 'outros';
    _catUserPicked = false;
    document.getElementById('modalTitle').textContent = 'Nova Despesa';
    setModalSaveLabel('✅ Adicionar Despesa');
    document.getElementById('fDesc').value  = '';
    document.getElementById('fValor').value = '';
    document.getElementById('fData').value  = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`;
    document.getElementById('fNota').value  = '';
    loadRateioIntoForm(null);
    loadGrupoIdIntoForm(null);
    atualizarSeletorDeGrupoNoFormulario();
    const toggle = document.getElementById('toggleRepetir');
    toggle.className = 'toggle';
    toggle.setAttribute('aria-checked', 'false');
    document.getElementById('repeatOptions').style.display = 'none';
    document.getElementById('parcelasRow').style.display   = 'none';
    document.getElementById('parcelaModoRow').style.display = 'none';
    setParcelaModo('parcela');
    document.getElementById('fParcelas').value = '2';
    ['fDesc','fValor','fData','fParcelas'].forEach(id => document.getElementById(id).classList.remove('error'));
    updateRadios();
    renderCatChips();
  }
  document.getElementById('modalOverlay').classList.add('open');
  lockBodyScroll();
  // FIX: garante que o formulário sempre abra do topo (evita herdar a posição
  // de rolagem de uma abertura anterior, que causava o vão em branco acima
  // do handle/título ao reabrir o modal).
  const modalScrollEl = document.getElementById('modalScroll');
  modalScrollEl.scrollTop = 0;
  goToModalStep(0);
  // Em mobile, abrir o teclado imediatamente some com o campo por trás dele;
  // focamos só depois da animação, sem forçar rolagem do fundo da página.
  setTimeout(() => {
    const el = document.getElementById('fDesc');
    el.focus({ preventScroll: true });
  }, 400);
}

// ── PASSOS FIXOS: cada tela cabe inteira, sem precisar rolar ──
// (as bolinhas do topo agora navegam de verdade, em vez de só
// acompanhar o scroll de um formulário único e comprido)
function validateModalStep0() {
  const desc  = document.getElementById('fDesc').value.trim();
  const valor = parseBRL(document.getElementById('fValor').value);
  const data  = document.getElementById('fData').value;
  if (!desc) {
    const el = document.getElementById('fDesc');
    el.classList.add('error'); el.focus();
    showToast('⚠️ Informe a descrição');
    return false;
  }
  if (!valor || valor <= 0) {
    const el = document.getElementById('fValor');
    el.classList.add('error'); el.focus();
    showToast('⚠️ Informe um valor válido');
    return false;
  }
  if (!data) {
    const el = document.getElementById('fData');
    el.classList.add('error'); el.focus();
    showToast('⚠️ Informe a data');
    return false;
  }
  ['fDesc','fValor','fData'].forEach(id => document.getElementById(id).classList.remove('error'));
  return true;
}

function goToModalStep(idx) {
  idx = Math.max(0, Math.min(MODAL_STEP_COUNT - 1, idx));
  _modalStep = idx;

  document.querySelectorAll('.modal-step').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.step) === idx);
  });
  document.querySelectorAll('#modalSteps .step-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
  document.getElementById('btnModalBack').style.display = idx === 0 ? 'none' : '';

  const btnSave = document.getElementById('btnSave');
  if (idx === MODAL_STEP_COUNT - 1) {
    const cleanLabel = _modalSaveLabel.replace('✅ ', '').replace('💾 ', '');
    btnSave.innerHTML = `<svg class="icon icon-sm" aria-hidden="true"><use href="#i-check"></use></svg> ${cleanLabel}`;
  } else {
    btnSave.innerHTML = `Próximo <svg class="icon icon-sm" aria-hidden="true"><use href="#i-chevron-right"></use></svg>`;
  }

  const modalScrollEl = document.getElementById('modalScroll');
  if (modalScrollEl) modalScrollEl.scrollTop = 0;
}

function modalNextStep() {
  if (_modalStep === 0 && !validateModalStep0()) return;
  if (_modalStep < MODAL_STEP_COUNT - 1) {
    goToModalStep(_modalStep + 1);
  } else {
    saveExpense();
  }
}

function modalPrevStep() {
  goToModalStep(_modalStep - 1);
}

function goToModalStepByDot(idx) {
  if (idx > _modalStep && _modalStep === 0 && !validateModalStep0()) return;
  goToModalStep(idx);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  unlockBodyScroll();
  editingId   = null;
  repeatOn    = false;
  repeatType  = 'fixo';
  selectedCat = 'outros';
}

// ── TRAVA DE SCROLL DO FUNDO ENQUANTO O MODAL ESTÁ ABERTO (fix mobile) ──
let _scrollY = 0;
function lockBodyScroll() {
  _scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${_scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}
function unlockBodyScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, _scrollY);
}

// Ao focar um campo dentro do modal (ex: com teclado aberto), garante que
// ele fique visível na área rolável, evitando o campo "sumir" atrás do teclado.
document.getElementById('modal').addEventListener('focusin', (e) => {
  if (e.target.matches('input, textarea, select')) {
    setTimeout(() => {
      e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 300);
  }
});

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
  if (e.target === document.getElementById('newCatOverlay')) closeNewCategoryForm();
  if (e.target === document.getElementById('manageCatOverlay')) closeManageCategories();
  if (e.target === document.getElementById('catBudgetOverlay')) closeCategoryBudgetEditor();
  if (e.target === document.getElementById('exportRangeOverlay')) closeExportRangeForm();
  if (e.target === document.getElementById('pixKeyOverlay')) closePixKeyModal();
}

function toggleRepetir() {
  repeatOn = !repeatOn;
  const t  = document.getElementById('toggleRepetir');
  t.className = 'toggle' + (repeatOn ? ' on' : '');
  t.setAttribute('aria-checked', String(repeatOn));
  document.getElementById('repeatOptions').style.display = repeatOn ? 'block' : 'none';
  document.getElementById('parcelaModoRow').style.display = (repeatOn && repeatType === 'parcelado') ? 'block' : 'none';
  updateParcelaPreview();
}

// ── GRUPO: marcar despesa como pertencente ao grupo compartilhado ──
let grupoDespesaOn = false;

function toggleGrupoDespesa() {
  grupoDespesaOn = !grupoDespesaOn;
  const t = document.getElementById('toggleGrupoDespesa');
  t.className = 'toggle' + (grupoDespesaOn ? ' on' : '');
  t.setAttribute('aria-checked', String(grupoDespesaOn));
}

function readGrupoIdFromForm() {
  return grupoDespesaOn && window.meuGrupo ? window.meuGrupo.id : null;
}

function loadGrupoIdIntoForm(grupoId) {
  grupoDespesaOn = !!grupoId;
  const t = document.getElementById('toggleGrupoDespesa');
  t.className = 'toggle' + (grupoDespesaOn ? ' on' : '');
  t.setAttribute('aria-checked', String(grupoDespesaOn));
}

// Mostra o toggle só pra quem realmente tem um grupo — sem grupo, a
// opção nem aparece (não faz sentido oferecer o que não existe ainda)
function atualizarSeletorDeGrupoNoFormulario() {
  const card = document.getElementById('grupoDespesaCard');
  const label = document.getElementById('nomeMeuGrupoLabel');
  if (!card) return;
  if (window.meuGrupo) {
    card.style.display = 'block';
    if (label) label.textContent = `"${window.meuGrupo.nome}"`;
  } else {
    card.style.display = 'none';
    grupoDespesaOn = false;
  }
}

// ── RATEIO: dividir a conta com outra pessoa ──
// O valor da despesa é o da conta CHEIA. A "sua parte" (%) é o que entra nos
// totais; a lista mostra a conta inteira e a parte de cada um.
let rateioOn = false;
let rateioPagoPorMim = true;

function toggleRateio() {
  rateioOn = !rateioOn;
  const t = document.getElementById('toggleRateio');
  t.className = 'toggle' + (rateioOn ? ' on' : '');
  t.setAttribute('aria-checked', String(rateioOn));
  document.getElementById('rateioOptions').style.display = rateioOn ? 'block' : 'none';
  if (rateioOn) { renderRateioMembros(); updateRateioPreview(); }
}

function setRateioPct(p) {
  document.getElementById('fRateioPct').value = p;
  updateRateioPreview();
}

function setRateioPagoPor(euPago) {
  rateioPagoPorMim = !!euPago;
  document.getElementById('segPagoEu').classList.toggle('active', rateioPagoPorMim);
  document.getElementById('segPagoOutro').classList.toggle('active', !rateioPagoPorMim);
}

// Atalho: membros do grupo viram botões pra preencher o nome
function renderRateioMembros() {
  const box = document.getElementById('rateioMembros');
  if (!box) return;
  const map = window.meuGrupoMembrosMap || {};
  const outros = Object.entries(map).filter(([id]) => id !== currentUser?.id).map(([, nome]) => nome);
  box.innerHTML = outros.map(n =>
    `<button type="button" onclick="document.getElementById('fRateioNome').value=this.textContent;updateRateioPreview()">${sanitize(n)}</button>`
  ).join('');
}

function updateRateioPreview() {
  const el = document.getElementById('rateioPreview');
  if (!el) return;
  if (!rateioOn) { el.textContent = ''; return; }
  const valor = parseBRL(document.getElementById('fValor').value);
  const pct   = Math.min(99, Math.max(1, parseInt(document.getElementById('fRateioPct').value) || 50));
  const nome  = document.getElementById('fRateioNome').value.trim() || 'A outra pessoa';
  if (!valor) { el.textContent = `Você fica com ${pct}% · ${nome} com ${100 - pct}%`; return; }
  const eu = round2(valor * pct / 100);
  el.textContent = `Conta ${formatBRL(valor)} → você ${formatBRL(eu)} · ${nome} ${formatBRL(round2(valor - eu))}. Só a sua parte entra nos seus totais.`;
}

function readRateioFromForm() {
  if (!rateioOn) return null;
  let nome = document.getElementById('fRateioNome').value.trim();
  const pct  = parseInt(document.getElementById('fRateioPct').value) || 50;
  if (!nome) {
    // grupo de duas pessoas: assume o outro membro
    const outros = Object.entries(window.meuGrupoMembrosMap || {}).filter(([id]) => id !== currentUser?.id);
    if (outros.length === 1) nome = outros[0][1];
  }
  if (!nome) return null;
  return { com: nome, percentual: Math.min(99, Math.max(1, pct)), pagoPorMim: rateioPagoPorMim };
}

function loadRateioIntoForm(rateio) {
  rateioOn = !!rateio;
  const t = document.getElementById('toggleRateio');
  t.className = 'toggle' + (rateioOn ? ' on' : '');
  t.setAttribute('aria-checked', String(rateioOn));
  document.getElementById('rateioOptions').style.display = rateioOn ? 'block' : 'none';
  document.getElementById('fRateioNome').value = rateio?.com || '';
  document.getElementById('fRateioPct').value  = rateio?.percentual || 50;
  setRateioPagoPor(rateio ? rateio.pagoPorMim !== false : true);
  renderRateioMembros();
  updateRateioPreview();
}

// ── PARCELADO: o valor digitado é da parcela ou do total da compra? ──
let parcelaModo = 'parcela';

function setParcelaModo(m) {
  parcelaModo = m;
  document.getElementById('segParcela').classList.toggle('active', m === 'parcela');
  document.getElementById('segTotal').classList.toggle('active', m === 'total');
  updateParcelaPreview();
}

function updateParcelaPreview() {
  const el = document.getElementById('parcelaPreview');
  if (!el) return;
  if (!(repeatOn && repeatType === 'parcelado')) { el.textContent = ''; return; }
  const valor = parseBRL(document.getElementById('fValor').value);
  const n = parseInt(document.getElementById('fParcelas').value) || 0;
  if (!valor || n < 2) { el.textContent = ''; return; }
  const parcela = parcelaModo === 'total' ? round2(valor / n) : valor;
  const total   = parcelaModo === 'total' ? valor : round2(valor * n);
  el.textContent = `${n}x de ${formatBRL(parcela)} = ${formatBRL(total)}. No mês só a parcela entra no total de dívidas.`;
}

function selectType(type) {
  repeatType = type;
  updateRadios();
  document.getElementById('parcelasRow').style.display = type === 'parcelado' ? 'flex' : 'none';
  document.getElementById('parcelaModoRow').style.display = type === 'parcelado' ? 'block' : 'none';
  updateParcelaPreview();
}

function updateRadios() {
  const fixoEl    = document.getElementById('radioFixo');
  const parcelaEl = document.getElementById('radioParcela');
  fixoEl.className    = 'radio-circle' + (repeatType === 'fixo'      ? ' selected' : '');
  parcelaEl.className = 'radio-circle' + (repeatType === 'parcelado' ? ' selected' : '');
  fixoEl.setAttribute('aria-checked',    String(repeatType === 'fixo'));
  parcelaEl.setAttribute('aria-checked', String(repeatType === 'parcelado'));
}

function renderCatChips() {
  document.getElementById('catRow').innerHTML = CATEGORIES.map(c =>
    `<div class="cat-card${selectedCat === c.id ? ' active' : ''}"
          onclick="selectCat('${c.id}')"
          role="radio" aria-checked="${selectedCat === c.id}"
          tabindex="0">
       <span class="cat-emoji">${c.emoji}</span>
       <span class="cat-label">${sanitize(c.label)}</span>
     </div>`
  ).join('') + `
    <div class="cat-card" onclick="openNewCategoryForm()" role="button" tabindex="0"
         aria-label="Criar nova categoria" style="border-style:dashed;">
       <span class="cat-emoji"><svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg></span>
       <span class="cat-label">Nova</span>
     </div>`;
}

// ═══════════════════════════════════════════════
