// Chamado uma vez no carregamento da página.
// Verifica se já tem sessão ativa; se não, mostra a tela de login.
async function initAuth() {
  // Modo offline (file://) ou SDK não carregou: pula login, usa localStorage
  if (IS_LOCAL || !supabaseClient) {
    loadLocalFallback();
    pickSmartMonthOnLaunch();
    renderAll();
    return;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      await onLoginSuccess(session.user);
    } else {
      showAuthScreen();
    }
  } catch(e) {
    // Falha de rede na inicialização: vai para modo local
    loadLocalFallback();
    pickSmartMonthOnLaunch();
    renderAll();
    return;
  }

  // Ouve mudanças de sessão (ex: expirou, fez logout em outra aba)
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await onLoginSuccess(session.user);
    } else {
      currentUser = null;
      showAuthScreen();
    }
  });
}

function loadLocalFallback() {
  try {
    const stored = localStorage.getItem('despesas_v2');
    const parsed = JSON.parse(stored || '[]');
    expenses = Array.isArray(parsed) ? parsed : [];
  } catch(e) { expenses = []; }
  try {
    const storedPix = localStorage.getItem('pix_keys_v1');
    const parsedPix = JSON.parse(storedPix || '[]');
    pixKeys = Array.isArray(parsedPix) ? parsedPix : [];
  } catch(e) { pixKeys = []; }
  renderPixKeysList();
}

// ── TELA DE LOGIN ──────────────────────────────
function showAuthScreen() {
  document.getElementById('auth-screen').classList.add('visible');
}
function hideAuthScreen() {
  document.getElementById('auth-screen').classList.remove('visible');
}

function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
  setAuthError('');
}

function setAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.toggle('visible', !!msg);
}

function setAuthLoading(loading) {
  const btn = document.getElementById('auth-submit-btn');
  const msg = document.getElementById('auth-loading-msg');
  btn.disabled = loading;
  msg.textContent = loading ? (authMode === 'login' ? '⏳ Entrando...' : '⏳ Criando conta...') : '';
}

async function handleAuthSubmit() {
  if (!supabaseClient) { setAuthError('Sem conexão com o servidor.'); return; }

  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  setAuthError('');

  if (!email || !password) {
    setAuthError('Preencha e-mail e senha.');
    return;
  }
  if (password.length < 6) {
    setAuthError('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  setAuthLoading(true);

  try {
    let result;
    if (authMode === 'login') {
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    } else {
      result = await supabaseClient.auth.signUp({ email, password });
    }

    if (result.error) {
      const msgs = {
        'Invalid login credentials':   'E-mail ou senha incorretos.',
        'Email already registered':    'E-mail já cadastrado. Tente entrar.',
        'User already registered':     'E-mail já cadastrado. Tente entrar.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
      };
      setAuthError(msgs[result.error.message] || result.error.message);
      setAuthLoading(false);
      return;
    }

    // Cadastro bem-sucedido sem confirmação de e-mail
    if (authMode === 'signup' && result.data?.user && !result.data.session) {
      setAuthError('');
      document.getElementById('auth-loading-msg').textContent = '✅ Conta criada! Entrando...';
      // Faz login automático após cadastro
      const login = await supabaseClient.auth.signInWithPassword({ email, password });
      if (login.error) {
        setAuthError('Conta criada! Faça login agora.');
        setAuthLoading(false);
        switchAuthTab('login');
        return;
      }
    }
    // onAuthStateChange cuida do resto
  } catch (e) {
    setAuthError('Erro de conexão. Verifique sua internet.');
    setAuthLoading(false);
  }
}

// Permite enviar com Enter nos campos
document.addEventListener('DOMContentLoaded', () => {
  ['auth-email','auth-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); });
  });

  // Enter nos campos de texto do modal salva a despesa (não no campo de data, que usa seletor nativo)
  ['fDesc','fValor','fNota'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); saveExpense(); }
    });
  });

  // Enter no inline edit confirma
  const iEl = document.getElementById('inlineEditInput');
  if (iEl) iEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); confirmInlineEdit(); }
    if (e.key === 'Escape') cancelInlineEdit();
  });

  // Escape fecha o modal principal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('modalOverlay').classList.contains('open')) closeModal();
      if (document.getElementById('inlineEditOverlay').classList.contains('open')) cancelInlineEdit();
      if (document.getElementById('newCatOverlay').classList.contains('open')) closeNewCategoryForm();
      if (document.getElementById('manageCatOverlay').classList.contains('open')) closeManageCategories();
      if (document.getElementById('catBudgetOverlay').classList.contains('open')) closeCategoryBudgetEditor();
      if (document.getElementById('exportRangeOverlay').classList.contains('open')) closeExportRangeForm();
    }
  });
});

// ── PÓS-LOGIN ─────────────────────────────────
async function onLoginSuccess(user) {
  currentUser = user;
  hideAuthScreen();
  updateDrawerUser(user);

  // Carregar dados do Supabase
  await loadFromSupabase();

  // Verificar se precisa mostrar banner de migração
  checkMigrationBanner();

  // Verificar contas vencendo hoje/amanhã (uma vez por dia)
  checkDueReminders(false);

  setSyncStatus('synced', '☁️ Sincronizado');
}

// ── LOGOUT ────────────────────────────────────
async function handleLogout() {
  if (!supabaseClient) return;
  const confirmar = await mostrarPopup({
    emoji:  '👋',
    titulo: 'Sair da conta?',
    texto:  'Seus dados ficam salvos na nuvem. Pode entrar novamente a qualquer momento.',
    botoes: [
      { texto: 'Sair',      classe: 'confirm-btn-danger',    valor: true  },
      { texto: 'Cancelar',  classe: 'confirm-btn-secondary', valor: false }
    ]
  });
  if (!confirmar) return;
  closeDrawer();
  await supabaseClient.auth.signOut();
  expenses = [];
  renderAll();
}

// ── DRAWER: INFO DO USUÁRIO ───────────────────
function updateDrawerUser(user) {
  const info  = document.getElementById('drawer-user-info');
  const emailEl = document.getElementById('drawer-user-email');
  if (info && emailEl) {
    info.style.display = 'flex';
    const displayName = user?.user_metadata?.display_name;
    emailEl.textContent = displayName ? `${displayName} · ${user.email}` : (user?.email || '');
  }
}

// ── PERFIL: NOME DE EXIBIÇÃO ──────────────────
// Guardado em user_metadata do próprio Supabase Auth (sem tabela nova,
// sem custo extra de storage) — usado na saudação da Home.
function openProfileEditor() {
  const input = document.getElementById('profileName');
  input.value = currentUser?.user_metadata?.display_name || '';
  document.getElementById('profileOverlay').classList.add('open');
  setTimeout(() => input.focus(), 150);
}

function closeProfileEditor() {
  document.getElementById('profileOverlay').classList.remove('open');
}

async function saveProfileName() {
  const nome = document.getElementById('profileName').value.trim();
  if (!supabaseClient || !currentUser) { closeProfileEditor(); return; }
  const { data, error } = await supabaseClient.auth.updateUser({ data: { display_name: nome } });
  if (error) { showToast('Não foi possível salvar o nome agora.'); return; }
  currentUser = data.user;
  updateDrawerUser(currentUser);
  closeProfileEditor();
  showToast('Perfil atualizado!');
  if (currentTab === 'inicio') renderHome();
}

// ── INDICADOR DE SINCRONIZAÇÃO ────────────────
function setSyncStatus(state, msg) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.className = 'sync-indicator ' + state;
  el.textContent = msg;
  if (state === 'synced') {
    setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
  }
}

// ═══════════════════════════════════════════════
