// MODAL
// ═══════════════════════════════════════════════
function openModal(reset = false) {
  if (!editingId || reset) {
    editingId   = null;
    repeatOn    = false;
    repeatType  = 'fixo';
    selectedCat = 'outros';
    document.getElementById('modalTitle').textContent = 'Nova Despesa';
    document.getElementById('btnSave').textContent = '✅ Adicionar Despesa';
    document.getElementById('fDesc').value  = '';
    document.getElementById('fValor').value = '';
    document.getElementById('fData').value  = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`;
    document.getElementById('fNota').value  = '';
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
  updateStepDots();
  // Em mobile, abrir o teclado imediatamente some com o campo por trás dele;
  // focamos só depois da animação, sem forçar rolagem do fundo da página.
  setTimeout(() => {
    const el = document.getElementById('fDesc');
    el.focus({ preventScroll: true });
  }, 400);
}

// ── INDICADOR DE PASSOS (dots): acompanha o scroll do formulário ──
function updateStepDots() {
  const el = document.getElementById('modalScroll');
  const dots = document.querySelectorAll('#modalSteps .step-dot');
  const max = el.scrollHeight - el.clientHeight;
  const frac = max > 0 ? el.scrollTop / max : 0;
  let step = 0;
  if (frac > 0.66) step = 2;
  else if (frac > 0.2) step = 1;
  dots.forEach((d, i) => d.classList.toggle('active', i === step));
}
document.getElementById('modalScroll').addEventListener('scroll', updateStepDots, { passive: true });

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
