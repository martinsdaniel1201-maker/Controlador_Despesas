// ═══════════════════════════════════════════════
// RENDER — INÍCIO (DASHBOARD PREMIUM)
// Não lê nem grava nenhum dado novo: usa exatamente as mesmas
// fontes que já alimentam Despesas/Relatório/Ferramentas
// (expenses[], sim_salario, sim_meta_pct), então nada do
// histórico do usuário é criado, movido ou perdido.
// ═══════════════════════════════════════════════

function getGreetingWord() {
  const h = new Date().getHours();
  if (h < 5)  return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getDashUserName() {
  try {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.email) {
      const raw = currentUser.email.split('@')[0].replace(/[._-]+/g, ' ').trim();
      if (raw) return raw.split(' ')[0].replace(/^\w/, c => c.toUpperCase());
    }
  } catch (e) {}
  return '';
}

// Anima um número subindo até o valor final (efeito "vivo" nos cards)
function animateDashValue(el, finalValue) {
  if (!el) return;
  const duration = 800;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = finalValue * eased;
    el.textContent = (current < 0 ? '-' : '') + formatBRL(Math.abs(current));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function getMonthTotals(y, m) {
  const raw  = getMonthExpenses(y, m);
  const disp = raw.map(e => getDisplayExpense(e, y, m));
  const total = disp.reduce((s, e) => s + e.valor, 0);
  const paid  = disp.filter(e => e.paid).reduce((s, e) => s + e.valor, 0);
  const byCat = {};
  disp.forEach(e => {
    const c = e.categoria || 'outros';
    byCat[c] = (byCat[c] || 0) + e.valor;
  });
  return { disp, total, paid, pending: total - paid, count: disp.length, byCat };
}

function buildInsightsSectionHtml() {
  const list = generateInsights(currentYear, currentMonth);
  if (!list.length) return '';
  const cards = list.map((ins, idx) => `
    <div class="insight-card tone-${ins.tone}" style="animation-delay:${Math.min(idx * 0.06, 0.6).toFixed(2)}s">
      <span class="insight-icon"><svg class="icon icon-sm" aria-hidden="true"><use href="#${ins.icon}"></use></svg></span>
      <div class="insight-body">
        <div class="insight-title">${sanitize(ins.title)}</div>
        <div class="insight-text">${ins.text}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="insights-section">
      <div class="insights-header">
        <span class="insights-title"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-sparkle"></use></svg> Insights Financeiros</span>
        <span class="insights-count">${list.length}</span>
      </div>
      <div class="insights-list">${cards}</div>
    </div>
  `;
}

function buildScoreCardHtml() {
  const data = computeFinancialScore();
  const band = getScoreBand(data.score);
  const prevScore = getStoredScore();
  const baseline = prevScore === null ? data.score : prevScore;
  const delta = data.score - baseline;
  const explanation = buildScoreExplanation(data);
  const tips = buildScoreTips(data);

  const R = 52, CX = 60, CY = 60;
  const circumference = 2 * Math.PI * R;

  const deltaChip = delta > 0
    ? `<span class="score-delta-chip up">+${delta}</span>`
    : delta < 0
      ? `<span class="score-delta-chip down">${delta}</span>`
      : '';

  const tipsHtml = tips.length
    ? `<div class="score-tips">
         <div class="score-tips-title">Dicas para melhorar</div>
         <ul class="score-tips-list">${tips.map(t => `<li>${t}</li>`).join('')}</ul>
       </div>`
    : `<div class="score-tips score-tips-ok">Todos os indicadores estão em bom nível — continue assim!</div>`;

  return {
    html: `
      <div class="dash-card score-card ${delta > 0 ? 'score-improved' : ''}">
        <div class="dash-card-head">
          <span class="dash-card-icon score-shield"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-shield"></use></svg></span>
          <span class="dash-card-title">Score Financeiro</span>
          ${deltaChip}
        </div>
        <div class="score-ring-row">
          <div class="score-ring-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="var(--border)" stroke-width="12"/>
              <circle id="scoreRingFill" cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${band.color}"
                stroke-width="12" stroke-linecap="round"
                stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${circumference.toFixed(2)}"
                transform="rotate(-90 ${CX} ${CY})"/>
            </svg>
            <div class="score-ring-center">
              <span class="score-number" id="scoreNumberValue">0</span>
              <span class="score-max">/100</span>
            </div>
          </div>
          <div class="score-info">
            <span class="score-band-badge" style="color:${band.color};background:${band.color}1f">${band.label}</span>
            <p class="score-explain">${explanation}</p>
          </div>
        </div>
        ${tipsHtml}
      </div>
    `,
    finalScore: data.score,
    baseline,
    circumference,
  };
}

function animateScoreCard(scoreData) {
  const numEl  = document.getElementById('scoreNumberValue');
  const ringEl = document.getElementById('scoreRingFill');
  if (ringEl) {
    requestAnimationFrame(() => {
      const target = scoreData.circumference * (1 - scoreData.finalScore / 100);
      ringEl.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)';
      ringEl.style.strokeDashoffset = target.toFixed(2);
    });
  }
  if (numEl) {
    const from = scoreData.baseline;
    const to = scoreData.finalScore;
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      numEl.textContent = Math.round(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  storeScore(scoreData.finalScore);
}

function renderHome() {
  const container = document.getElementById('dashContainer');
  if (!container) return;

  // ── DADOS DO MÊS ATUAL ──
  const cur = getMonthTotals(currentYear, currentMonth);

  // ── DADOS DO MÊS ANTERIOR (para comparação) ──
  let prevMonth = currentMonth - 1, prevYear = currentYear;
  if (prevMonth < 0) { prevMonth = 11; prevYear--; }
  const prev = getMonthTotals(prevYear, prevMonth);

  // ── RECEITA / META (mesma fonte da aba Ferramentas) ──
  let salario = 0, metaPct = 0;
  try {
    salario = parseBRL(localStorage.getItem('sim_salario') || '');
    metaPct = parseFloat(localStorage.getItem('sim_meta_pct')) || 0;
  } catch (e) {}

  const saldoAtual   = salario > 0 ? (salario - cur.total) : -cur.total;
  const economiaMes  = salario > 0 ? Math.max(salario - cur.total, 0) : 0;
  const economiaPct  = salario > 0 ? Math.round((economiaMes / salario) * 100) : 0;
  const valorMeta     = salario > 0 ? (salario * metaPct) / 100 : 0;
  const metaProgress  = valorMeta > 0 ? Math.min(Math.round((economiaMes / valorMeta) * 100), 100) : 0;

  // ── COMPARAÇÃO COM MÊS ANTERIOR ──
  const delta = cur.total - prev.total;
  let deltaPct = 0;
  if (prev.total > 0) deltaPct = Math.round((delta / prev.total) * 100);
  else if (cur.total > 0) deltaPct = 100;
  const gastouMais = delta > 0.005;
  const gastouMenos = delta < -0.005;

  // ── MAIOR GASTO DO MÊS ──
  let maiorGasto = null;
  if (cur.disp.length) {
    maiorGasto = cur.disp.reduce((max, e) => (e.valor > (max ? max.valor : -1) ? e : max), null);
  }
  const maiorGastoPct = maiorGasto && cur.total > 0 ? Math.round((maiorGasto.valor / cur.total) * 100) : 0;
  const maiorGastoCat = maiorGasto ? (CATEGORIES.find(c => c.id === (maiorGasto.categoria || 'outros')) || CATEGORIES[9]) : null;

  // ── MAIOR ECONOMIA (categoria em que você gastou menos que no mês passado) ──
  let maiorEconomia = null;
  Object.keys(prev.byCat).forEach(catId => {
    const antes  = prev.byCat[catId] || 0;
    const agora  = cur.byCat[catId] || 0;
    const diff   = antes - agora;
    if (antes > 0 && diff > 0.005 && (!maiorEconomia || diff > maiorEconomia.diff)) {
      maiorEconomia = { catId, diff, antes, agora };
    }
  });
  const maiorEconomiaCat = maiorEconomia ? (CATEGORIES.find(c => c.id === maiorEconomia.catId) || CATEGORIES[9]) : null;

  // ── SAUDAÇÃO ──
  const nome = getDashUserName();
  const saudacao = nome ? `${getGreetingWord()}, ${sanitize(nome)}` : getGreetingWord();

  // ── RESUMO FINANCEIRO (narrativa) ──
  const isRealCurrentMonth = (currentYear === new Date().getFullYear() && currentMonth === new Date().getMonth());
  let resumoTxt = '';
  if (cur.disp.length === 0) {
    resumoTxt = `Nenhuma despesa lançada ${isRealCurrentMonth ? 'neste mês' : 'neste período'} ainda. Seu dinheiro está intacto — ótimo momento para planejar as próximas contas.`;
  } else {
    const partes = [];
    partes.push(`Você já soma ${formatBRL(cur.total)} em despesas${isRealCurrentMonth ? ' este mês' : ' nesse mês'}, com ${formatBRL(cur.paid)} já pagos e ${formatBRL(cur.pending)} ainda em aberto.`);
    if (prev.total > 0) {
      if (gastouMais)  partes.push(`Isso é ${Math.abs(deltaPct)}% a mais do que em ${monthShortLabel(prevYear, prevMonth)}.`);
      else if (gastouMenos) partes.push(`Isso é ${Math.abs(deltaPct)}% a menos do que em ${monthShortLabel(prevYear, prevMonth)} — parabéns pelo controle!`);
      else partes.push(`Praticamente o mesmo valor de ${monthShortLabel(prevYear, prevMonth)}.`);
    }
    if (maiorGasto) partes.push(`O maior peso veio de "${sanitize(maiorGasto.label)}", responsável por ${maiorGastoPct}% do total.`);
    if (salario > 0) {
      if (saldoAtual >= 0) partes.push(`Considerando sua renda informada, ainda sobram ${formatBRL(saldoAtual)} neste mês.`);
      else partes.push(`Suas despesas já superam a renda informada em ${formatBRL(Math.abs(saldoAtual))} — vale revisar os gastos.`);
    }
    resumoTxt = partes.join(' ');
  }

  function monthShortLabel(y, m) {
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return months[m] + '/' + y;
  }

  // ── MONTAGEM DO HTML ──
  const deltaChip = prev.total > 0 || cur.total > 0
    ? `<span class="dash-delta-chip ${gastouMais ? 'up-bad' : gastouMenos ? 'down-good' : 'neutral'}">
         <svg class="icon icon-sm" aria-hidden="true"><use href="#${gastouMais ? 'i-trend-up' : gastouMenos ? 'i-trend-down' : 'i-trend-up'}"></use></svg>
         ${gastouMais || gastouMenos ? Math.abs(deltaPct) + '%' : '='} vs ${sanitize(monthShortLabel(prevYear, prevMonth))}
       </span>`
    : '';

  // ── SCORE FINANCEIRO PREMIUM ──
  const scoreCard = buildScoreCardHtml();

  container.innerHTML = `
    <div class="dash-hero">
      <div class="dash-hero-glow"></div>
      <div class="dash-hero-top">
        <span class="dash-greeting">${saudacao} <svg class="icon icon-sm" aria-hidden="true"><use href="#i-sparkle"></use></svg></span>
      </div>
      <div class="dash-hero-label">Saldo do mês</div>
      <div class="dash-balance ${saldoAtual < 0 ? 'negative' : ''}" id="dashSaldoValue">R$ 0,00</div>
      <div class="dash-hero-bottom">
        ${deltaChip}
        ${salario === 0 ? '<span class="dash-hint">Informe sua renda em Ferramentas para ver o saldo completo</span>' : ''}
      </div>
    </div>

    ${scoreCard.html}

    <div class="dash-grid-2">
      <div class="dash-mini-card income">
        <div class="dash-mini-icon"><svg class="icon" aria-hidden="true"><use href="#i-wallet"></use></svg></div>
        <div class="dash-mini-label">Receitas</div>
        <div class="dash-mini-value" id="dashReceitaValue">R$ 0,00</div>
      </div>
      <div class="dash-mini-card expense">
        <div class="dash-mini-icon"><svg class="icon" aria-hidden="true"><use href="#i-credit-card"></use></svg></div>
        <div class="dash-mini-label">Despesas</div>
        <div class="dash-mini-value" id="dashDespesaValue">R$ 0,00</div>
      </div>
    </div>

    <div class="dash-card economy-card">
      <div class="dash-card-head">
        <span class="dash-card-icon econ"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-piggy"></use></svg></span>
        <span class="dash-card-title">Economia do mês</span>
        <span class="dash-card-badge">${salario > 0 ? economiaPct + '%' : '—'}</span>
      </div>
      <div class="dash-card-value" id="dashEconomiaValue">R$ 0,00</div>
      <div class="dash-bar-bg"><div class="dash-bar-fill econ-fill" style="width:${salario > 0 ? Math.min(economiaPct, 100) : 0}%"></div></div>
      <div class="dash-card-explain">
        ${salario === 0
          ? 'Cadastre sua renda em Ferramentas para acompanhar quanto sobra do salário.'
          : economiaMes > 0
            ? `Você ainda não gastou ${formatBRL(economiaMes)} da sua renda — ${economiaPct}% preservados até agora.`
            : 'Toda a renda informada já foi comprometida com despesas este mês.'}
      </div>
    </div>

    <div class="dash-card goal-card">
      <div class="dash-card-head">
        <span class="dash-card-icon goal"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-target"></use></svg></span>
        <span class="dash-card-title">Meta mensal</span>
        <span class="dash-card-badge">${metaPct > 0 ? metaPct + '%' : 'sem meta'}</span>
      </div>
      ${metaPct > 0 ? `
        <div class="dash-card-value">${formatBRL(valorMeta)} <span class="dash-card-value-sub">objetivo</span></div>
        <div class="dash-bar-bg"><div class="dash-bar-fill goal-fill" style="width:${metaProgress}%"></div></div>
        <div class="dash-card-explain">
          ${metaProgress >= 100
            ? '🎉 Meta de economia batida este mês!'
            : `Você já guardou ${formatBRL(economiaMes)} de ${formatBRL(valorMeta)} (${metaProgress}% da meta).`}
        </div>
      ` : `
        <div class="dash-card-explain">Defina uma meta de economia (% do salário) na aba Ferramentas para acompanhar seu progresso aqui.</div>
      `}
    </div>

    <div class="dash-grid-2 insights">
      <div class="dash-insight-card">
        <span class="dash-card-icon alert"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-zap"></use></svg></span>
        <div class="dash-insight-label">Maior gasto</div>
        ${maiorGasto ? `
          <div class="dash-insight-name">${maiorGastoCat.emoji} ${sanitize(maiorGasto.label)}</div>
          <div class="dash-insight-value">${formatBRL(maiorGasto.valor)}</div>
          <div class="dash-insight-sub">${maiorGastoPct}% do total do mês</div>
        ` : `<div class="dash-insight-empty">Sem despesas ainda</div>`}
      </div>
      <div class="dash-insight-card">
        <span class="dash-card-icon good"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-trend-down"></use></svg></span>
        <div class="dash-insight-label">Maior economia</div>
        ${maiorEconomia ? `
          <div class="dash-insight-name">${maiorEconomiaCat.emoji} ${sanitize(maiorEconomiaCat.label)}</div>
          <div class="dash-insight-value good">-${formatBRL(maiorEconomia.diff)}</div>
          <div class="dash-insight-sub">vs ${sanitize(monthShortLabel(prevYear, prevMonth))}</div>
        ` : `<div class="dash-insight-empty">Nenhuma categoria reduziu ainda</div>`}
      </div>
    </div>

    <div class="dash-card summary-card">
      <div class="dash-card-head">
        <span class="dash-card-icon summary"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-bar-chart"></use></svg></span>
        <span class="dash-card-title">Resumo financeiro</span>
      </div>
      <p class="dash-summary-text">${resumoTxt}</p>
    </div>

    ${buildInsightsSectionHtml()}
  `;

  // ── ANIMAÇÕES: números "vivos" + entrada escalonada ──
  animateDashValue(document.getElementById('dashSaldoValue'), saldoAtual);
  animateDashValue(document.getElementById('dashReceitaValue'), salario);
  animateDashValue(document.getElementById('dashDespesaValue'), cur.total);
  animateDashValue(document.getElementById('dashEconomiaValue'), economiaMes);
  animateScoreCard(scoreCard);

  container.classList.remove('dash-animate');
  void container.offsetWidth;
  container.classList.add('dash-animate');
}

// ═══════════════════════════════════════════════
