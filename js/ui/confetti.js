// ═══════════════════════════════════════════════════════════
// CONFETES — celebração leve para conquistas (meta batida, mês
// 100% quitado). Só DOM/CSS, sem dependências.
// ═══════════════════════════════════════════════════════════
const CONFETTI_COLORS = ['#7c3aed', '#4338ca', '#16a34a', '#f59e0b', '#dc2626', '#06b6d4'];

function fireConfetti(count) {
  count = count || 26;
  const overlay = document.createElement('div');
  overlay.className = 'confetti-overlay';
  document.body.appendChild(overlay);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const startX = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 160;
    const duration = 1.4 + Math.random() * 1.1;
    const delay = Math.random() * 0.25;
    const spin = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360);
    const isRound = i % 3 === 0;
    piece.style.left = startX + '%';
    piece.style.background = color;
    piece.style.borderRadius = isRound ? '50%' : '2px';
    piece.style.setProperty('--drift', drift.toFixed(0) + 'px');
    piece.style.setProperty('--spin', spin.toFixed(0) + 'deg');
    piece.style.animationDuration = duration.toFixed(2) + 's';
    piece.style.animationDelay = delay.toFixed(2) + 's';
    overlay.appendChild(piece);
  }

  setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 2800);
}

// ═══════════════════════════════════════════════════════════
