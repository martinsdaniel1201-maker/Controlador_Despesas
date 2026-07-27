// FRASES MOTIVACIONAIS (#10)
// ═══════════════════════════════════════════════
function getMotivation(pct, pending, count) {
  if (count === 0) return '✨ Nenhuma despesa este mês. Aproveite!';
  if (pct === 100) return '🏆 Todas as contas pagas! Mês quitado!';
  if (pct >= 80)   return `💪 Quase lá! Faltam só ${count - Math.round(count * pct/100)} conta(s)!`;
  if (pct >= 50)   return '👍 Mais da metade paga. Continue assim!';
  if (pct >= 20)   return '🚀 Bom começo! Mantenha o ritmo.';
  return '📋 Organize seus pagamentos do mês!';
}

// ═══════════════════════════════════════════════
