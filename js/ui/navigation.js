// NAVEGAÇÃO & FILTROS
// ═══════════════════════════════════════════════
function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  updateMonthLabel();
  triggerListAnimation();
  renderAll();
  if (currentTab === 'stats')     renderStats();
  if (currentTab === 'historico') renderHistorico();
  if (currentTab === 'inicio')    renderHome();
}

function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  triggerListAnimation();
  renderList();
}

function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  ['tabInicio','tabDespesas','tabStats','tabSimulacao','tabHistorico'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  const tabMap = { inicio: 'tabInicio', despesas: 'tabDespesas', stats: 'tabStats', simulacao: 'tabSimulacao', historico: 'tabHistorico' };
  document.getElementById(tabMap[tab]).style.display = 'block';
  if (tab === 'inicio')    renderHome();
  if (tab === 'stats')     renderStats();
  if (tab === 'simulacao') { loadSimInputs(); calcularSimulacao(); }
  if (tab === 'historico') renderHistorico();
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
