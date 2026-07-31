// ═══════════════════════════════════════════════════════════
// MÊS INTELIGENTE AO ABRIR O APP
// ═══════════════════════════════════════════════════════════
// Em vez de sempre abrir no mês real de hoje, procura — na janela
// de 3 meses antes até 3 meses depois de hoje, do mais antigo pro
// mais novo — o primeiro mês que ainda tem despesa pendente (dívida
// atrasada tem prioridade sobre planejamento futuro). Se nenhum mês
// da janela tiver pendência, cai no mês real como antes.
// Roda uma única vez por sessão (não deve reagir a cada re-render).
// ═══════════════════════════════════════════════════════════
let _smartMonthPicked = false;

function pickSmartMonthOnLaunch() {
  if (_smartMonthPicked) return;
  _smartMonthPicked = true;

  const now = new Date();
  const ry = now.getFullYear(), rm = now.getMonth();
  const LOOKBACK = 3, LOOKFORWARD = 3;

  for (let i = -LOOKBACK; i <= LOOKFORWARD; i++) {
    let mm = rm + i, yy = ry;
    while (mm < 0)  { mm += 12; yy--; }
    while (mm > 11) { mm -= 12; yy++; }

    const t = getMonthTotals(yy, mm);
    if (t.pending > 0.005) {
      currentYear = yy;
      currentMonth = mm;
      updateMonthLabel();
      if (!(yy === ry && mm === rm)) {
        const label = (typeof monthLabelPT === 'function') ? monthLabelPT(yy, mm, true) : `${mm + 1}/${yy}`;
        setTimeout(() => showToast(`📅 Mostrando ${label} — ainda tem pendência aqui`), 500);
      }
      return;
    }
  }
  // Nenhuma pendência na janela toda: mantém o mês real (comportamento padrão)
  currentYear = ry;
  currentMonth = rm;
  updateMonthLabel();
}

// ═══════════════════════════════════════════════════════════
