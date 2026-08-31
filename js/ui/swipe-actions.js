// ═══════════════════════════════════════════════
// SWIPE NO ITEM DA DESPESA — arrastar pra direita
// marca como pago/pendente, arrastar pra esquerda
// exclui (com a confirmação que já existe). Padrão
// de gesto usado em Gmail/WhatsApp.
// ═══════════════════════════════════════════════
(function setupItemSwipe() {
  const THRESHOLD   = 90;   // px de arrasto pra disparar a ação
  const MAX_DRAG    = 120;  // px máximo visual (não deixa "sair" demais)
  const MAX_OFF_AXIS = 12;  // graus de tolerância vertical antes de cancelar

  let dragging   = false;
  let locked     = false;   // já decidimos que é um gesto horizontal?
  let startX = 0, startY = 0;
  let itemEl = null, wrapperEl = null;

  function getList() { return document.getElementById('expenseList'); }

  function resetOtherOpenItems(except) {
    document.querySelectorAll('.expense-item.swiping').forEach(el => {
      if (el !== except) snapBack(el);
    });
  }

  function snapBack(el) {
    el.style.transition = 'transform 0.25s ease';
    el.style.transform = '';
    el.classList.remove('swiping');
    setTimeout(() => { el.style.transition = ''; }, 260);
  }

  function onStart(e) {
    const wrapper = e.target.closest('.swipe-wrapper');
    if (!wrapper) return;
    // não inicia o swipe se o toque começou no botão de menu (⋮) ou dentro do popover
    if (e.target.closest('.item-menu-btn') || e.target.closest('.item-menu')) return;
    const item = wrapper.querySelector('.expense-item');
    if (!item) return;
    if (item.classList.contains('readonly-grupo')) return; // despesa de outro membro — sem swipe
    const t = e.touches[0];
    dragging = true; locked = false;
    startX = t.clientX; startY = t.clientY;
    itemEl = item; wrapperEl = wrapper;
    resetOtherOpenItems(item);
    item.style.transition = 'none';
  }

  function onMove(e) {
    if (!dragging || !itemEl) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // ainda não deu pra saber a direção
      locked = Math.abs(dx) > Math.abs(dy);
      if (!locked) { dragging = false; return; } // é scroll vertical, devolve o gesto pra página
    }
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    itemEl.style.transform = `translate3d(${clamped}px,0,0)`;
    itemEl.classList.add('swiping');
    if (e.cancelable) e.preventDefault();
  }

  function onEnd(e) {
    if (!dragging || !itemEl) { dragging = false; return; }
    dragging = false;
    if (!locked) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const id = wrapperEl.dataset.expid;
    const item = itemEl;
    snapBack(item);

    if (dx >= THRESHOLD) {
      const onClick = item.getAttribute('onclick') || '';
      const match = onClick.match(/togglePay\('([^']+)','([^']*)'\)/);
      if (match) togglePay(match[1], match[2]);
    } else if (dx <= -THRESHOLD) {
      deleteExpense(id);
    }
    itemEl = null; wrapperEl = null;
  }

  const list = getList();
  if (!list) return;
  list.addEventListener('touchstart', onStart, { passive: true });
  list.addEventListener('touchmove', onMove, { passive: false });
  list.addEventListener('touchend', onEnd, { passive: true });
  list.addEventListener('touchcancel', () => {
    if (itemEl) snapBack(itemEl);
    dragging = false; itemEl = null; wrapperEl = null;
  }, { passive: true });
})();
