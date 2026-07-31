// ═══════════════════════════════════════════════════════════
// SELO NO ÍCONE DO APP (Badging API)
// ═══════════════════════════════════════════════════════════
// Mostra, no ícone do app instalado, quantas contas do mês real
// estão vencidas e ainda não pagas — igual ao selo de mensagens não
// lidas de outros apps. Suportado em Chrome/Edge (Android/desktop
// instalado); em navegadores sem suporte, a chamada simplesmente
// não faz nada (feature detection via 'in navigator').
// ═══════════════════════════════════════════════════════════
function computeOverdueCountForBadge() {
  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const disp = getMonthExpenses(now.getFullYear(), now.getMonth())
    .map(e => getDisplayExpense(e, now.getFullYear(), now.getMonth()))
    .filter(e => !e.paid);

  let count = 0;
  disp.forEach(e => {
    const parts = e.dateStr.split('/');
    if (parts.length < 3) return;
    const due = new Date(parts[2], parts[1] - 1, parts[0]);
    if (due < today) count++;
  });
  return count;
}

function updateAppBadge() {
  if (!('setAppBadge' in navigator)) return;
  try {
    const count = computeOverdueCountForBadge();
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════
