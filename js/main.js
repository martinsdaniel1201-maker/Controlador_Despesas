// INICIALIZAÇÃO
// ═══════════════════════════════════════════════
function renderAll() { renderList(); calcularSimulacao(); renderHome(); if (typeof updateAppBadge === 'function') updateAppBadge(); }

updateMonthLabel();
renderCatChips();
loadSimInputs();

// Máscara inline edit
aplicarMascaraDinheiro(document.getElementById('inlineEditInput'));

// ═ SUPABASE: verificar sessão e carregar dados (substitui renderAll() direto)
// Se já logado, initAuth chama renderAll internamente via loadFromSupabase.
// Se não logado, mostra a tela de login antes de qualquer render.
initAuth();
updateUpdateBadge();
setTimeout(() => { if (typeof maybeShowOnboarding === 'function') maybeShowOnboarding(); }, 1500);
