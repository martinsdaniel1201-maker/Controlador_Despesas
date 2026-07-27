// FORMATAÇÃO
// ═══════════════════════════════════════════════
function formatBRL(v) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function parseBRL(valStr) {
  if (!valStr) return 0;
  // Remove "R$", espaços → remove pontos de milhar → troca vírgula decimal por ponto
  const clean = String(valStr)
    .replace(/R\$\s*/g, '')
    .trim()
    .replace(/\./g, '')   // remove separador de milhar
    .replace(',', '.');   // vírgula decimal → ponto
  return parseFloat(clean) || 0;
}

// ═══════════════════════════════════════════════
