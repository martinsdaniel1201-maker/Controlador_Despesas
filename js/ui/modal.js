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

// ── RATEIO: dividir a despesa com outra pessoa ──
// Fica só informativo — o valor total continua contando normal
// nos totais/relatórios, sem mexer nos cálculos que já existem.
let rateioOn = false;

function toggleRateio() {
  rateioOn = !rateioOn;
  const t = document.getElementById('toggleRateio');
  t.className = 'toggle' + (rateioOn ? ' on' : '');
  t.setAttribute('aria-checked', String(rateioOn));
  document.getElementById('rateioOptions').style.display = rateioOn ? 'block' : 'none';
}

function readRateioFromForm() {
  if (!rateioOn) return null;
  const nome = document.getElementById('fRateioNome').value.trim();
  const pct  = parseInt(document.getElementById('fRateioPct').value) || 50;
  if (!nome) return null;
  return { com: nome, percentual: Math.min(99, Math.max(1, pct)) };
}

function loadRateioIntoForm(rateio) {
  rateioOn = !!rateio;
  const t = document.getElementById('toggleRateio');
  t.className = 'toggle' + (rateioOn ? ' on' : '');
  t.setAttribute('aria-checked', String(rateioOn));
  document.getElementById('rateioOptions').style.display = rateioOn ? 'block' : 'none';
  document.getElementById('fRateioNome').value = rateio?.com || '';
  document.getElementById('fRateioPct').value  = rateio?.percentual || 50;
}

function selectType(type) {
  repeatType = type;
  updateRadios();
  document.getElementById('parcelasRow').style.display = type === 'parcelado' ? 'flex' : 'none';
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
