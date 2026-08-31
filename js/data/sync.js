// SUPABASE — PERSISTÊNCIA
// ═══════════════════════════════════════════════
// A partir da migração pro "grupo compartilhado": os dados deixaram de
// ficar num blob único por usuário e passaram a morar na tabela relacional
// `despesas` (uma linha por despesa) + `user_settings` (categorias/pix).
// Por baixo dos panos mudou tudo; pro resto do app (formulário, exclusão,
// swipe etc.) nada muda, porque todo mundo só mexe no array `expenses`
// local e chama save()/persistExpenses() — só essas duas funções abaixo
// sabem como isso vira linhas no banco.

// Converte um item do array local `expenses` pro formato de linha da tabela `despesas`
function _toDbRow(e, userId) {
  return {
    id: String(e.id),
    user_id: e.user_id || userId, // preserva o dono original — nunca "rouba" a posse de uma despesa do grupo
    grupo_id: e.grupoId || null,
    descricao: e.descricao,
    valor: e.valor,
    data_original: e.dataOriginal,
    categoria: e.categoria,
    tipo: e.tipo,
    total_parcelas: e.totalParcelas ?? null,
    month_key: e.monthKey,
    pagamentos: e.pagamentos || {},
    nota: e.nota || null,
    rateio: e.rateio || null,
    updated_at: new Date().toISOString(),
  };
}

// Converte uma linha vinda do banco de volta pro formato que o resto do
// app já espera (mesmos nomes de campo de sempre: dataOriginal, monthKey...)
function _fromDbRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    descricao: row.descricao,
    valor: Number(row.valor),
    dataOriginal: row.data_original,
    categoria: row.categoria,
    tipo: row.tipo,
    totalParcelas: row.total_parcelas,
    monthKey: row.month_key,
    pagamentos: row.pagamentos || {},
    nota: row.nota || '',
    rateio: row.rateio || null,
    grupoId: row.grupo_id || null,
  };
}

// Carrega o array de despesas do Supabase para a variável global expenses
async function loadFromSupabase() {
  if (!supabaseClient || !currentUser) return;
  try {
    // Sem filtro de user_id: o RLS já devolve as minhas despesas +
    // as que forem de um grupo do qual eu participo — é a mesma
    // consulta pra "só eu" ou "eu + grupo", o banco decide o que
    // é visível.
    const { data: rows, error } = await supabaseClient
      .from('despesas')
      .select('*');
    if (error) throw error;
    expenses = (rows || []).map(_fromDbRow);
  } catch (e) {
    console.error('Erro ao carregar despesas do Supabase:', e);
    // Fallback: mantém o que está no localStorage — mas isso NÃO deve
    // acontecer por causa de uma falha em categorias/Pix (ver abaixo),
    // só se a própria busca de despesas falhar.
    try {
      const stored = localStorage.getItem('despesas_v2');
      expenses = JSON.parse(stored || '[]');
    } catch { expenses = []; }
  }

  // FIX: categorias/Pix são secundários — uma falha aqui não pode apagar
  // as despesas que acabaram de carregar certinho acima. Por isso ficam
  // num try/catch totalmente separado.
  try {
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('categories, pix_keys')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (settingsError) throw settingsError;

    if (Array.isArray(settings?.categories) && settings.categories.length > 0) {
      applyCategoriesFromCloud(settings.categories);
    }
    pixKeys = Array.isArray(settings?.pix_keys) ? settings.pix_keys : [];
    try { localStorage.setItem('pix_keys_v1', JSON.stringify(pixKeys)); } catch {}
    renderPixKeysList();
  } catch (e) {
    console.error('Erro ao carregar categorias/Pix do Supabase:', e);
  }
  if (typeof invalidateMonthTotalsCache === 'function') invalidateMonthTotalsCache();
  if (typeof carregarMeuGrupoCache === 'function') carregarMeuGrupoCache();
  pickSmartMonthOnLaunch();
  renderAll();
}

// Salva categorias/chaves Pix (não são despesa, ficam numa tabela à parte)
async function _saveUserSettings() {
  if (!supabaseClient || !currentUser) return;
  const { error } = await supabaseClient
    .from('user_settings')
    .upsert(
      { user_id: currentUser.id, categories: getCustomCategoriesList(), pix_keys: pixKeys, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// Salva o array expenses no Supabase — upsert de cada linha.
// FIX DE SEGURANÇA: isso aqui só ADICIONA/ATUALIZA, nunca apaga por
// dedução. Antes, essa função comparava o que estava salvo no banco com
// o array local e apagava a "diferença" — se o carregamento inicial
// viesse incompleto por qualquer motivo, o salvamento seguinte podia
// apagar despesas de verdade. Agora exclusão só acontece de um jeito:
// explicitamente, no momento em que o usuário exclui algo (veja
// deleteFromSupabase, chamada direto em deleteExpense).
async function saveToSupabase() {
  if (!supabaseClient || !currentUser) return;
  setSyncStatus('syncing', '⏳ Salvando...');
  try {
    // Importante: só envio despesas que são MINHAS (ou novas, sem dono
    // ainda). Uma despesa do grupo criada por outra pessoa pode estar
    // no meu array local (pra eu conseguir ver ela), mas eu nunca devo
    // regravar ela — isso poderia sobrescrever campos que só o dono
    // deveria controlar.
    const minhas = expenses.filter(e => !e.user_id || e.user_id === currentUser.id);
    const rows = minhas.map(e => _toDbRow(e, currentUser.id));
    if (rows.length > 0) {
      const { error } = await supabaseClient.from('despesas').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    await _saveUserSettings();

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

// Exclusão explícita de UMA despesa — chamada direto no momento em que
// o usuário exclui, em vez de "deduzida" num salvamento genérico depois.
async function deleteFromSupabase(id) {
  if (!supabaseClient || !currentUser) return;
  try {
    const { error } = await supabaseClient
      .from('despesas')
      .delete()
      .eq('id', String(id))
      .eq('user_id', currentUser.id);
    if (error) throw error;
  } catch (e) {
    console.error('Erro ao excluir no Supabase:', e);
    showToast('⚠️ Não foi possível excluir na nuvem agora — tente sincronizar de novo depois.');
  }
}
