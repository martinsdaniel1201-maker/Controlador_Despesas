// FRASES MOTIVACIONAIS (#10)
// ═══════════════════════════════════════════════
// FIX: antes essa função recebia a contagem real de pendentes (`pending`)
// e simplesmente IGNORAVA — recalculava um número diferente fazendo
// "total - arredondar(total * pct%)", que é matemática com perda por
// causa do arredondamento da porcentagem. Resultado: esse card podia
// mostrar um número de pendentes diferente do badge vermelho, que usa
// a contagem real. Agora usa `pending` (a contagem de verdade) direto,
// sem recalcular nada.
function getMotivation(pct, pending, count) {
  if (count === 0) return '✨ Nenhuma despesa este mês. Aproveite!';
  if (pct === 100) return '🏆 Todas as contas pagas! Mês quitado!';
  if (pct >= 80)   return `💪 Quase lá! Faltam só ${pending} conta(s)!`;
  if (pct >= 50)   return '👍 Mais da metade paga. Continue assim!';
  if (pct >= 20)   return '🚀 Bom começo! Mantenha o ritmo.';
  return '📋 Organize seus pagamentos do mês!';
}

// ═══════════════════════════════════════════════
