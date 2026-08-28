// ═══════════════════════════════════════════════
// GESTOS DE NAVEGAÇÃO — "voltar" arrastando da borda
// esquerda pra direita, como no iOS/Android atuais.
// Prioridade: fecha o que estiver aberto por cima
// (modal, painel, drawer, menu de ação) antes de
// voltar pra aba anterior.
// ═══════════════════════════════════════════════

// Cada entrada: id do elemento + como fechá-lo, na ordem em que
// devem ser verificados (o que normalmente fica "por cima" primeiro).
const _EDGE_SWIPE_CLOSERS = [
  { id: 'confirmOverlay',        close: () => { const el = document.getElementById('confirmOverlay'); el.classList.remove('open'); el.innerHTML = ''; } },
  { id: 'onboardingOverlay',     close: () => finishOnboarding?.() },
  { id: 'newCatOverlay',         close: () => closeNewCategoryForm() },
  { id: 'pixKeyOverlay',         close: () => closePixKeyModal() },
  { id: 'manageCatOverlay',      close: () => closeManageCategories() },
  { id: 'catBudgetOverlay',      close: () => closeCategoryBudgetEditor() },
  { id: 'exportRangeOverlay',    close: () => closeExportRangeForm() },
  { id: 'inlineEditOverlay',     close: () => cancelInlineEdit() },
  { id: 'modalOverlay',          close: () => closeModal() },
  { id: 'settingsDrawer',        close: () => closeSettingsDrawer() },
  { id: 'drawer',                close: () => closeDrawer() },
];

function _closeTopmostOverlay() {
  // Menu de ações (⋮) de uma despesa também conta como "camada aberta"
  if (document.querySelector('.item-menu.open')) { closeItemMenus(); return true; }
  for (const entry of _EDGE_SWIPE_CLOSERS) {
    const el = document.getElementById(entry.id);
    if (el && el.classList.contains('open')) { entry.close(); return true; }
  }
  return false;
}

(function setupEdgeSwipeBack() {
  const EDGE_ZONE   = 24;   // px a partir da borda esquerda pra começar a valer
  const MIN_DRAG    = 70;   // px de arrasto pra considerar um "voltar" válido
  const MAX_OFF_AXIS = 60;  // px de variação vertical tolerada (evita brigar com scroll)
  const MAX_TIME    = 600;  // ms — gesto tem que ser um arrasto, não um toque parado

  let active = false;
  let startX = 0, startY = 0, startTime = 0;
  let dragTarget = null;

  function pickDragTarget() {
    // Se tem um overlay aberto, "puxa" ele; senão, puxa o corpo da página
    // (a sensação de arrastar a tela atual pra revelar a anterior).
    for (const entry of _EDGE_SWIPE_CLOSERS) {
      const el = document.getElementById(entry.id);
      if (el && el.classList.contains('open')) return el;
    }
    const menu = document.querySelector('.item-menu.open');
    if (menu) return null; // menu pequeno — não precisa de arrasto visual
    return document.body;
  }

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX > EDGE_ZONE) return; // só conta perto da borda esquerda
    active = true;
    startX = t.clientX;
    startY = t.clientY;
    startTime = Date.now();
    dragTarget = pickDragTarget();
    if (dragTarget) dragTarget.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!active) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);
    if (dy > MAX_OFF_AXIS && dy > dx) { active = false; if (dragTarget) resetDrag(); return; }
    if (dx > 0 && dragTarget) {
      const clamped = Math.min(dx, 120);
      dragTarget.style.transform = `translate3d(${clamped}px,0,0)`;
      dragTarget.style.opacity = String(1 - clamped / 260);
    }
  }, { passive: true });

  function resetDrag() {
    if (!dragTarget) return;
    dragTarget.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    dragTarget.style.transform = '';
    dragTarget.style.opacity = '';
    setTimeout(() => { if (dragTarget) dragTarget.style.transition = ''; }, 220);
  }

  document.addEventListener('touchend', (e) => {
    if (!active) return;
    active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);
    const elapsed = Date.now() - startTime;
    const valid = dx >= MIN_DRAG && dy <= MAX_OFF_AXIS && elapsed <= MAX_TIME;
    resetDrag();
    if (!valid) return;
    if (_closeTopmostOverlay()) return;
    goBackTab();
  }, { passive: true });

  document.addEventListener('touchcancel', () => { active = false; resetDrag(); }, { passive: true });
})();
