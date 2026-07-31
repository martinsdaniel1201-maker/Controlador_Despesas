// SUPABASE — PERSISTÊNCIA
// ═══════════════════════════════════════════════

// Carrega o array de despesas do Supabase para a variável global expenses
async function loadFromSupabase() {
  if (!supabaseClient || !currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('expenses')
      .select('data, categories, pix_keys')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (error) throw error;
    expenses = Array.isArray(data?.data) ? data.data : [];
    if (Array.isArray(data?.categories) && data.categories.length > 0) {
      applyCategoriesFromCloud(data.categories);
    }
    pixKeys = Array.isArray(data?.pix_keys) ? data.pix_keys : [];
    try { localStorage.setItem('pix_keys_v1', JSON.stringify(pixKeys)); } catch {}
    renderPixKeysList();
  } catch (e) {
    console.error('Erro ao carregar do Supabase:', e);
    // Fallback: mantém o que está no localStorage
    try {
      const stored = localStorage.getItem('despesas_v2');
      expenses = JSON.parse(stored || '[]');
    } catch { expenses = []; }
  }
  if (typeof invalidateMonthTotalsCache === 'function') invalidateMonthTotalsCache();
  pickSmartMonthOnLaunch();
  renderAll();
}

// Salva o array expenses no Supabase via upsert (uma linha por usuário)
async function saveToSupabase() {
  if (!supabaseClient || !currentUser) return;
  setSyncStatus('syncing', '⏳ Salvando...');
  try {
    const { error } = await supabaseClient
      .from('expenses')
      .upsert(
        { user_id: currentUser.id, data: expenses, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
    setSyncStatus('synced', '☁️ Salvo na nuvem');
    try { localStorage.setItem('lastSyncTime', String(Date.now())); } catch {}
    updateLastSyncDisplay();
  } catch (e) {
    console.error('Erro ao salvar no Supabase:', e);
    setSyncStatus('error', '⚠️ Erro ao salvar');
    // Fallback: salva local
    try { localStorage.setItem('despesas_v2', JSON.stringify(expenses)); } catch {}
  }
}

// ═══════════════════════════════════════════════
