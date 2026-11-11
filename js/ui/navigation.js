// NAVEGAÇÃO & FILTROS
// ═══════════════════════════════════════════════
function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  updateMonthLabel();
  animateMonthLabel();
  triggerListAnimation(dir);
  renderAll();
  if (currentTab === 'stats')     renderStats();
  if (currentTab === 'historico') renderHistorico();
  if (currentTab === 'inicio')    renderHome();
  animateContentSwitch(dir);
}

function animateMonthLabel() {
  const label = document.getElementById('monthLabel');
  if (!label) return;
  label.classList.remove('month-label-pulse');
  void label.offsetWidth;
  label.classList.add('month-label-pulse');
}

// Aplica uma transição direcional suave ao conteúdo da aba que está
// visível no momento da troca de mês (a lista já ganha a própria
// animação via triggerListAnimation; aqui cobrimos Início/Relatório/Histórico).
function animateContentSwitch(dir) {
  const idByTab = { inicio: 'dashContainer', stats: 'statsContainer', historico: 'historicoContainer' };
  const id = idByTab[currentTab];
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('content-slide-in-l', 'content-slide-in-r');
  void el.offsetWidth;
  el.classList.add(dir > 0 ? 'content-slide-in-l' : 'content-slide-in-r');
  // não deixa a classe presa (reiniciaria a animação ao voltar pra aba)
  clearTimeout(el._slideTimer);
  el._slideTimer = setTimeout(() => el.classList.remove('content-slide-in-l', 'content-slide-in-r'), 450);
}

function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  triggerListAnimation();
  renderList();
}

// O app tem 3 abas na barra: Início, Despesas e Planejar.
// "Planejar" agrupa Relatório, Histórico e Ferramentas (seletor no topo).
const PLAN_GROUP = ['stats', 'historico', 'simulacao'];
const _PANEL_IDS = { inicio: 'tabInicio', despesas: 'tabDespesas', stats: 'tabStats', simulacao: 'tabSimulacao', historico: 'tabHistorico' };
let _planSub = 'stats';
let _tabHistory = [];

function switchTab(tab, btn) {
  if (tab === 'planejar') tab = _planSub;          // volta pra última sub-seção usada
  if (tab !== currentTab) {
    _tabHistory.push(currentTab);                  // alimenta o gesto de "voltar"
    if (_tabHistory.length > 20) _tabHistory.shift();
  }
  currentTab = tab;

  const barKey = PLAN_GROUP.includes(tab) ? 'planejar' : tab;
  document.querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.tab === barKey;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });

  Object.values(_PANEL_IDS).forEach(id => { document.getElementById(id).style.display = 'none'; });
  const panel = document.getElementById(_PANEL_IDS[tab]);
  panel.style.display = 'block';
  panel.classList.remove('tab-fade-in');
  void panel.offsetWidth;
  panel.classList.add('tab-fade-in');

  const nav = document.getElementById('planejarNav');
  if (nav) {
    const inGroup = PLAN_GROUP.includes(tab);
    nav.style.display = inGroup ? 'flex' : 'none';
    if (inGroup) {
      _planSub = tab;
      nav.querySelectorAll('button').forEach(b => {
        const on = b.dataset.sub === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
  }

  if (tab === 'inicio')    { renderHome(); if (typeof refreshQuickChips === 'function') refreshQuickChips(); }
  if (tab === 'despesas'   && typeof refreshQuickChips === 'function') refreshQuickChips();
  if (tab === 'stats')     renderStats();
  if (tab === 'simulacao') { loadSimInputs(); calcularSimulacao(); }
  if (tab === 'historico') renderHistorico();
}

function goBackTab() {
  if (!_tabHistory.length) return false;
  const prevTab = _tabHistory.pop();
  const before = _tabHistory;      // switchTab empurra currentTab de volta pro histórico
  switchTab(prevTab);
  _tabHistory = before;            // voltar não deve "esquecer pra frente"
  return true;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function openDrawer() {
  updateDarkModeBtn();
  updateReminderBtn();
  updateLastSyncDisplay();
  updateUpdateBadge();
  document.getElementById('drawerOverlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}

// ── PAINEL DE CONFIGURAÇÕES (sub-menu do kebab) ──
function openSettingsDrawer() {
  updateDarkModeBtn();
  updateReminderBtn();
  updateUpdateBadge();
  document.getElementById('settingsDrawerOverlay').classList.add('open');
  document.getElementById('settingsDrawer').classList.add('open');
}
function closeSettingsDrawer() {
  document.getElementById('settingsDrawerOverlay').classList.remove('open');
  document.getElementById('settingsDrawer').classList.remove('open');
}

// ── BADGE DE ATUALIZAÇÃO PENDENTE ──
// Não temos como comparar versão (não há endpoint de versão), então usamos
// como sinal indireto o tempo desde a última vez que o usuário clicou em
// "Buscar atualizações". Se passou muito tempo, damos destaque visual
// (bolinha no kebab + no item Configurações + no próprio card) para chamar
// atenção, já que hoje isso passava despercebido dentro do menu.
const UPDATE_CHECK_THRESHOLD_DIAS = 7;
function updateUpdateBadge() {
  const ts = parseInt(localStorage.getItem('lastUpdateCheck') || '0', 10);
  const diasSemChecar = ts ? Math.floor((Date.now() - ts) / 86400000) : Infinity;
  const pendente = diasSemChecar >= UPDATE_CHECK_THRESHOLD_DIAS;

  const kebabBadge = document.getElementById('btnMenuBadge');
  const entryBadge = document.getElementById('settingsEntryBadge');
  const cardDot    = document.getElementById('updateCardDot');
  const cardSub    = document.getElementById('updateCardSub');

  if (kebabBadge) kebabBadge.classList.toggle('visible', pendente);
  if (entryBadge) entryBadge.classList.toggle('visible', pendente);
  if (cardDot)    cardDot.style.display = pendente ? 'block' : 'none';

  if (cardSub) {
    if (!ts) {
      cardSub.textContent = 'Você ainda não verificou nesta instalação';
    } else if (diasSemChecar <= 0) {
      cardSub.textContent = 'Verificado hoje ✓';
    } else {
      cardSub.textContent = 'Última verificação há ' + diasSemChecar + (diasSemChecar > 1 ? ' dias' : ' dia');
    }
  }
}

// ── ÚLTIMA SINCRONIZAÇÃO (indicador persistente) ──
function updateLastSyncDisplay() {
  const el = document.getElementById('lastSyncTime');
  if (!el) return;
  const ts = parseInt(localStorage.getItem('lastSyncTime') || '0', 10);
  if (!ts) { el.textContent = ''; return; }
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  let txt;
  if (diffMin < 1)       txt = 'agora mesmo';
  else if (diffMin < 60) txt = 'há ' + diffMin + ' min';
  else if (diffMin < 1440) txt = 'há ' + Math.floor(diffMin / 60) + 'h';
  else txt = 'há ' + Math.floor(diffMin / 1440) + 'd';
  el.textContent = '☁️ Última sincronização: ' + txt;
}
function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}

// ═══════════════════════════════════════════════
