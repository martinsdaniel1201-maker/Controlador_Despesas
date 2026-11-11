// ═══════════════════════════════════════════════
// RENDA MENSAL E META DE ECONOMIA
// ═══════════════════════════════════════════════
// Fonte única: 'sim_salario' e 'sim_meta_pct' no localStorage (é de lá que
// Início, Relatório, Score e Calculadora já leem — nada mudou pra eles).
// Novidade: a renda é pedida UMA vez, pode ser editada de qualquer tela e
// fica guardada na conta (user_metadata do Supabase), então vale em todos
// os aparelhos. Não precisa de tabela nova.
function formatInputBRL(n) {
  return (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getRenda() {
  try { return parseBRL(localStorage.getItem('sim_salario') || '') || 0; } catch (e) { return 0; }
}
function getMetaPct() {
  try { return parseFloat(localStorage.getItem('sim_meta_pct')) || 0; } catch (e) { return 0; }
}

let _rendaCloudTimer;
function syncRendaToCloud() {
  clearTimeout(_rendaCloudTimer);
  _rendaCloudTimer = setTimeout(async () => {
    try {
      if (!currentUser || typeof supabaseClient === 'undefined') return;
      const { data, error } = await supabaseClient.auth.updateUser({
        data: { renda_mensal: getRenda(), meta_economia_pct: getMetaPct() }
      });
      if (!error && data?.user) currentUser = data.user;
    } catch (e) { console.warn('Renda: não foi possível sincronizar agora', e); }
  }, 700);
}

// Chamada no login: a conta é a referência; se ainda não há nada lá, sobe o que já existe neste aparelho
function restoreRendaFromCloud(user) {
  const md = user?.user_metadata || {};
  try {
    if (md.renda_mensal != null) {
      localStorage.setItem('sim_salario', Number(md.renda_mensal) > 0 ? formatInputBRL(md.renda_mensal) : '');
      if (md.meta_economia_pct != null) {
        localStorage.setItem('sim_meta_pct', Number(md.meta_economia_pct) > 0 ? String(md.meta_economia_pct) : '');
      }
    } else if (getRenda() > 0) {
      syncRendaToCloud();
    }
  } catch (e) {}
  if (typeof loadSimInputs === 'function') loadSimInputs();
}

function refreshAfterRenda() {
  if (typeof loadSimInputs === 'function') loadSimInputs();
  if (typeof calcularSimulacao === 'function') calcularSimulacao();
  if (typeof renderHome === 'function') renderHome();
  if (currentTab === 'stats') renderStats();
}

// ── Modal "Sua renda" ──
function openRendaModal() {
  const renda = getRenda();
  document.getElementById('rendaInput').value = renda > 0 ? formatInputBRL(renda) : '';
  const meta = getMetaPct();
  document.getElementById('rendaMetaInput').value = meta > 0 ? meta : '';
  document.getElementById('rendaOverlay').classList.add('open');
  setTimeout(() => { const i = document.getElementById('rendaInput'); i.focus(); i.select(); }, 120);
}

function closeRendaModal(event) {
  if (event && event.target && event.target.id !== 'rendaOverlay') return;
  document.getElementById('rendaOverlay').classList.remove('open');
}

function saveRendaModal() {
  const valor = parseBRL(document.getElementById('rendaInput').value);
  const metaRaw = parseFloat(document.getElementById('rendaMetaInput').value);
  const meta = isNaN(metaRaw) ? 0 : Math.min(100, Math.max(0, metaRaw));
  try {
    localStorage.setItem('sim_salario', valor > 0 ? formatInputBRL(valor) : '');
    localStorage.setItem('sim_meta_pct', meta > 0 ? String(meta) : '');
  } catch (e) {}
  syncRendaToCloud();
  document.getElementById('rendaOverlay').classList.remove('open');
  refreshAfterRenda();
  showToast(valor > 0 ? '💰 Renda atualizada!' : 'Renda removida');
}

aplicarMascaraDinheiro(document.getElementById('rendaInput'));
document.getElementById('rendaInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveRendaModal(); });
