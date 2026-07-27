// SEGURANÇA: sanitize para prevenir XSS
// Toda saída de dados do usuário para innerHTML passa aqui.
// ═══════════════════════════════════════════════
function sanitize(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ═══════════════════════════════════════════════
