// FASE 3 — MIGRAÇÃO DE DADOS LOCAIS
// ═══════════════════════════════════════════════

// Verifica se há dados locais não migrados e exibe popup de migração
async function checkMigrationBanner() {
  const jaFezMigracao = localStorage.getItem('supabase_migrated') === 'true';
  if (jaFezMigracao) return;

  let localExpenses = [];
  try {
    const stored = localStorage.getItem('despesas_v2');
    localExpenses = JSON.parse(stored || '[]');
  } catch { return; }

  // Só pergunta se tiver dados locais E o Supabase estiver vazio
  if (localExpenses.length === 0 || expenses.length > 0) return;

  const confirmar = await mostrarPopup({
    emoji:  '📦',
    titulo: 'Migrar dados para a nuvem?',
    texto:  'Encontramos ' + localExpenses.length + ' despesa(s) salvas localmente neste dispositivo. Deseja enviá-las para sua conta na nuvem?',
    botoes: [
      { texto: '☁️ Migrar agora',  classe: 'confirm-btn-primary',   valor: true  },
      { texto: 'Agora não',        classe: 'confirm-btn-secondary', valor: false }
    ]
  });

  if (confirmar) {
    await runMigration(localExpenses);
  }
}

// Executa a migração: recebe os dados locais já lidos e envia ao Supabase
async function runMigration(localExpenses) {
  if (!localExpenses) {
    try {
      const stored = localStorage.getItem('despesas_v2');
      localExpenses = JSON.parse(stored || '[]');
    } catch {
      showToast('❌ Erro ao ler dados locais');
      return;
    }
  }

  if (!localExpenses.length) return;

  setSyncStatus('syncing', '⏳ Migrando dados...');
  showToast('⏳ Migrando ' + localExpenses.length + ' despesa(s)...');

  try {
    const { error } = await supabaseClient
      .from('expenses')
      .upsert(
        { user_id: currentUser.id, data: localExpenses, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) throw error;

    expenses = localExpenses;
    localStorage.setItem('supabase_migrated', 'true');
    setSyncStatus('synced', '☁️ Migração concluída!');
    showToast('✅ ' + localExpenses.length + ' despesa(s) migrada(s) com sucesso!');
    renderAll();
  } catch (e) {
    console.error('Erro na migração:', e);
    setSyncStatus('error', '⚠️ Falha na migração');
    showToast('❌ Erro na migração. Tente novamente.');
  }
}

// Mantida por compatibilidade (não faz mais nada, popup é fechado pelo próprio mostrarPopup)
function dismissMigration() {}

// ═══════════════════════════════════════════════
