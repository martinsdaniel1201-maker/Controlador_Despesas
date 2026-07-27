// PERSISTÊNCIA: debounced, com try/catch
// ═══════════════════════════════════════════════
let _saveTimer;
function save() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    if (!IS_LOCAL && supabaseClient && currentUser) {
      // Online e logado: salva no Supabase
      saveToSupabase();
    } else {
      // Modo local (file://) ou sem login: salva no localStorage
      try {
        localStorage.setItem('despesas_v2', JSON.stringify(expenses));
      } catch (e) {
        showToast('⚠️ Erro ao salvar! Armazenamento cheio?');
      }
    }
  }, 60);
}

// Versão aguardável de save(), sem debounce: usada no formulário de despesa
// para manter o spinner do botão "Salvar" visível até a gravação (Supabase
// ou localStorage) realmente terminar, em vez de fechar o modal na hora.
async function persistExpenses() {
  clearTimeout(_saveTimer);
  if (!IS_LOCAL && supabaseClient && currentUser) {
    await saveToSupabase();
  } else {
    try {
      localStorage.setItem('despesas_v2', JSON.stringify(expenses));
    } catch (e) {
      showToast('⚠️ Erro ao salvar! Armazenamento cheio?');
    }
  }
}

