// GRÁFICO DE ROSCA (DONUT) POR CATEGORIA — SVG puro, sem libs
// ═══════════════════════════════════════════════
function buildDonutSVG(sortedCats, total) {
  if (!sortedCats.length || total <= 0) return '';
  const size = 160, cx = 80, cy = 80, r = 58, strokeW = 22;
  const circumference = 2 * Math.PI * r;
  let offsetAcc = 0;
  const segments = sortedCats.map(([catId, val]) => {
    const cat    = CATEGORIES.find(c => c.id === catId) || CATEGORIES[9];
    const color  = CAT_COLORS[catId] || '#888';
    const frac   = val / total;
    const dash   = frac * circumference;
    const gap    = circumference - dash;
    const rotate = (offsetAcc / total) * 360 - 90;
    offsetAcc += val;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}"
      stroke-width="${strokeW}" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      transform="rotate(${rotate.toFixed(2)} ${cx} ${cy})" stroke-linecap="butt">
      <title>${sanitize(cat.label)}: ${formatBRL(val)}</title>
    </circle>`;
  }).join('');
  return `
    <div style="display:flex;justify-content:center;padding:8px 0 16px;">
      <svg viewBox="0 0 ${size} ${size}" width="180" height="180" role="img" aria-label="Gráfico de despesas por categoria">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${strokeW}"></circle>
        ${segments}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="15" font-weight="900" fill="var(--text)" font-family="Nunito, sans-serif">${formatBRL(total)}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-muted)" font-family="Nunito, sans-serif">total do mês</text>
      </svg>
    </div>`;
}

// ═══════════════════════════════════════════════
// RENDER — RELATÓRIO (STATS): visão geral + gráficos modernos
// ═══════════════════════════════════════════════
const STATS_SHORT_MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const STATS_WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function sparseMonthLabels(hist) {
  return hist.map((h, i) => (i % 2 === 1 || i === hist.length - 1) ? STATS_SHORT_MONTHS[h.month] : '');
}

function buildEvolucaoMensalHtml(hist) {
  const values = hist.map(h => h.total);
  const labels = sparseMonthLabels(hist);
  return `
    <div class="stats-card">
      <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-trend-up"></use></svg> Evolução Mensal de Gastos</h3>
      ${buildLineAreaChart(values, labels, { color: '#4338ca', highlightLast: true })}
    </div>`;
}

function buildReceitasDespesasHtml(hist, salario) {
  const values = hist.map(h => h.total);
  const labels = sparseMonthLabels(hist);
  if (salario <= 0) {
    return `
      <div class="stats-card">
        <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-dollar"></use></svg> Receitas x Despesas</h3>
        ${buildBarChart(values, labels, { color: '#4338ca', highlightIndex: values.length - 1, highlightColor: '#7c3aed' })}
        <p class="stats-chart-hint">Informe sua renda na aba Ferramentas para comparar com suas despesas mês a mês.</p>
      </div>`;
  }
  return `
    <div class="stats-card">
      <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-dollar"></use></svg> Receitas x Despesas</h3>
      ${buildBarChart(values, labels, {
        guideValue: salario, guideColor: '#16a34a', guideLabel: `Renda mensal: ${formatBRL(salario)}`,
        colorFn: v => (v > salario ? 'var(--red)' : '#16a34a'),
      })}
    </div>`;
}

function buildEvolucaoSaldoHtml(hist, salario) {
  const values = hist.map(h => salario > 0 ? (salario - h.total) : -h.total);
  const labels = sparseMonthLabels(hist);
  return `
    <div class="stats-card">
      <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-bar-chart"></use></svg> Evolução do Saldo</h3>
      ${buildLineAreaChart(values, labels, { dualColor: true, showZeroLine: true, highlightLast: true })}
      ${salario === 0 ? '<p class="stats-chart-hint">Sem renda informada, o saldo aqui é apenas o total de despesas invertido — cadastre sua renda em Ferramentas para um saldo real.</p>' : ''}
    </div>`;
}

function buildComparacao12MesesHtml(hist) {
  const values = hist.map(h => h.total);
  const labels = hist.map(h => STATS_SHORT_MONTHS[h.month]);
  const ativos = values.filter(v => v > 0);
  const media = ativos.length ? ativos.reduce((s, v) => s + v, 0) / ativos.length : 0;
  return `
    <div class="stats-card">
      <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-calendar"></use></svg> Comparação dos Últimos 12 Meses</h3>
      ${buildBarChart(values, labels, {
        highlightIndex: values.length - 1, highlightColor: '#7c3aed', color: '#a5b4fc',
        guideValue: media, guideColor: 'var(--text-muted)', guideLabel: `Média: ${formatBRL(media)}`,
      })}
    </div>`;
}

function buildDiasQueMaisGastaHtml() {
  const sums = [0, 0, 0, 0, 0, 0, 0];
  let counted = 0;
  expenses.forEach(e => {
    if (!e.dataOriginal) return;
    const d = new Date(e.dataOriginal + 'T12:00:00');
    if (isNaN(d.getTime())) return;
    sums[d.getDay()] += e.valor;
    counted++;
  });
  if (counted < 3) {
    return `
      <div class="stats-card">
        <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-calendar"></use></svg> Dias que Mais Gasta</h3>
        <div class="empty-state"><div class="emoji"><svg class="icon icon-xl" aria-hidden="true"><use href="#i-calendar"></use></svg></div><p>Lance mais despesas para revelar seu padrão de gastos na semana.</p></div>
      </div>`;
  }
  let maxIdx = 0;
  for (let i = 1; i < 7; i++) if (sums[i] > sums[maxIdx]) maxIdx = i;
  return `
    <div class="stats-card">
      <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-calendar"></use></svg> Dias que Mais Gasta</h3>
      ${buildBarChart(sums, STATS_WEEKDAYS, { highlightIndex: maxIdx, highlightColor: '#7c3aed', color: '#a5b4fc' })}
      <p class="stats-chart-hint">Baseado em todo o histórico de vencimentos lançados — ${sanitize(STATS_WEEKDAYS[maxIdx])} concentra o maior volume: ${formatBRL(sums[maxIdx])}.</p>
    </div>`;
}

function buildCategoriaDeltaListHtml(items, tone) {
  if (!items.length) return `<div class="stat-delta-empty">Nenhuma categoria ${tone === 'up' ? 'cresceu' : 'diminuiu'} em relação ao mês passado.</div>`;
  const maxDiff = Math.max(...items.map(i => i.diff), 1);
  return `
    <div class="chart-reveal-wrap stat-delta-list">
      ${items.map(i => {
        const pct = Math.max((i.diff / maxDiff) * 100, 4);
        const color = tone === 'up' ? 'var(--red)' : 'var(--green)';
        return `
          <div class="stat-delta-row">
            <span class="stat-delta-emoji">${i.cat.emoji}</span>
            <div class="stat-delta-info">
              <div class="stat-delta-name">${sanitize(i.cat.label)}</div>
              <div class="stat-delta-track"><div class="stat-delta-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
            </div>
            <span class="stat-delta-value" style="color:${color}">${tone === 'up' ? '+' : '-'}${formatBRL(i.diff)}</span>
          </div>`;
      }).join('')}
    </div>`;
}

function buildCategoriasEmAltaEQuedaHtml(cur, prev) {
  if (!prev || prev.count === 0) {
    return `
      <div class="stats-card">
        <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-trend-up"></use></svg> Categorias em Alta e em Queda</h3>
        <div class="empty-state"><p>Sem dados do mês anterior para comparar ainda.</p></div>
      </div>`;
  }
  const subiram = [], cairam = [];
  const allCatIds = new Set([...Object.keys(cur.byCat), ...Object.keys(prev.byCat)]);
  allCatIds.forEach(catId => {
    const antes = prev.byCat[catId] || 0;
    const agora = cur.byCat[catId] || 0;
    const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[9];
    const diff = agora - antes;
    if (antes > 0 && diff > 0.01) subiram.push({ cat, diff });
    else if (antes > 0 && -diff > 0.01) cairam.push({ cat, diff: -diff });
  });
  subiram.sort((a, b) => b.diff - a.diff);
  cairam.sort((a, b) => b.diff - a.diff);

  return `
    <div class="stats-card">
      <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#i-trend-up"></use></svg> Categorias em Alta e em Queda</h3>
      <div class="stat-delta-subtitle up"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-trend-up"></use></svg> Cresceram vs. mês passado</div>
      ${buildCategoriaDeltaListHtml(subiram.slice(0, 4), 'up')}
      <div class="stat-delta-subtitle down"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-trend-down"></use></svg> Diminuíram vs. mês passado</div>
      ${buildCategoriaDeltaListHtml(cairam.slice(0, 4), 'down')}
    </div>`;
}

function renderStats() {
  const raw   = getMonthExpenses(currentYear, currentMonth);
  const disp  = raw.map(e => getDisplayExpense(e, currentYear, currentMonth));
  const total = disp.reduce((s, e) => s + e.valor, 0);
  const paid  = disp.filter(e => e.paid).reduce((s, e) => s + e.valor, 0);

  const byCat = {};
  disp.forEach(e => {
    const c = e.categoria || 'outros';
    byCat[c] = (byCat[c] || 0) + e.valor;
  });
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxVal = sortedCats[0]?.[1] || 1;

  // Meta de economia do localStorage
  let salario = 0, metaPct = 0;
  try {
    salario = parseBRL(localStorage.getItem('sim_salario') || '');
    metaPct = parseFloat(localStorage.getItem('sim_meta_pct')) || 0;
  } catch(e) {}

  const budgetHtml = salario > 0 ? (() => {
    const gastoPct   = Math.min(Math.round((total / salario) * 100), 100);
    const pagoPct    = Math.min(Math.round((paid  / salario) * 100), 100);
    const metaVal    = (salario * metaPct) / 100;
    const sobra      = salario - total - metaVal;
    const gastoCor   = gastoPct > 80 ? 'var(--red)' : gastoPct > 60 ? 'var(--orange)' : 'var(--green)';
    return `
      <div class="budget-overview-card">
        <h3 style="display:flex;align-items:center;gap:8px;"><svg class="icon" aria-hidden="true"><use href="#i-dollar"></use></svg> Visão do Orçamento</h3>
        <div class="budget-bar-row">
          <div class="budget-bar-label"><span>Despesas vs Salário</span><span>${gastoPct}% (${formatBRL(total)})</span></div>
          <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${gastoPct}%;background:${gastoCor}"></div></div>
        </div>
        <div class="budget-bar-row">
          <div class="budget-bar-label"><span>Já pago do Salário</span><span>${pagoPct}% (${formatBRL(paid)})</span></div>
          <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${pagoPct}%;background:var(--green)"></div></div>
        </div>
        ${metaPct > 0 ? `
        <div class="budget-bar-row">
          <div class="budget-bar-label"><span>Meta poupança (${metaPct}%)</span><span>${formatBRL(metaVal)}</span></div>
          <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${metaPct}%;background:#9b59b6"></div></div>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px dashed var(--border);margin-top:4px;">
          <span style="font-size:13px;font-weight:800;color:var(--text-muted);">Saldo restante estimado:</span>
          <span style="font-size:14px;font-weight:900;color:${sobra>=0?'var(--green-dark)':'var(--red)'};">${formatBRL(sobra)}</span>
        </div>
      </div>`;
  })() : '';

  const catBudgets = loadCategoryBudgets();

  const categoriaCardHtml = `
    <div class="stats-card">
      <h3>Por Categoria</h3>
      ${sortedCats.length === 0
        ? '<div class="empty-state"><div class="emoji"><svg class="icon icon-xl" aria-hidden="true"><use href="#i-bar-chart"></use></svg></div><h3>Sem dados este mês</h3><p>Adicione despesas para ver o gráfico por categoria.</p></div>'
        : `<div class="chart-reveal-wrap">${buildDonutSVG(sortedCats, total)}</div>` + sortedCats.map(([catId, val]) => {
            const cat    = CATEGORIES.find(c => c.id === catId) || CATEGORIES[9];
            const pct    = (val / maxVal * 100).toFixed(0);
            const color  = CAT_COLORS[catId] || '#888';
            const pctTotal = ((val / total) * 100).toFixed(0);
            const limit  = catBudgets[catId] || 0;
            const limitPct = limit > 0 ? Math.min(Math.round((val / limit) * 100), 100) : 0;
            const overBudget = limit > 0 && val > limit;
            const limitColor = overBudget ? 'var(--red)' : limitPct >= 80 ? 'var(--orange)' : 'var(--green)';
            const budgetRow = limit > 0
              ? `<div class="budget-bar-row" style="margin-top:6px;">
                   <div class="budget-bar-label">
                     <span>${overBudget ? '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-alert"></use></svg> ' : ''}Meta: ${formatBRL(limit)}</span>
                     <span onclick="openCategoryBudgetEditor('${catId}')" role="button" tabindex="0"
                           style="cursor:pointer;text-decoration:underline;color:var(--text-muted);">editar</span>
                   </div>
                   <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${limitPct}%;background:${limitColor}"></div></div>
                 </div>`
              : `<div style="margin-top:4px;">
                   <span onclick="openCategoryBudgetEditor('${catId}')" role="button" tabindex="0"
                         style="cursor:pointer;font-size:11px;font-weight:800;color:var(--text-muted);text-decoration:underline;">
                     <svg class="icon icon-sm" aria-hidden="true"><use href="#i-target"></use></svg> definir meta
                   </span>
                 </div>`;
            return `<div class="cat-stat-row" style="flex-wrap:wrap;">
              <span class="cat-stat-icon" aria-hidden="true">${cat.emoji}</span>
              <div class="cat-stat-info">
                <div class="cat-stat-name">${sanitize(cat.label)}
                  <span style="color:var(--text-muted);font-weight:600;font-size:11px">${pctTotal}%</span>
                </div>
                <div class="cat-stat-bar">
                  <div class="cat-stat-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                ${budgetRow}
              </div>
              <span class="cat-stat-amount">${formatBRL(val)}</span>
            </div>`;
          }).join('')}
    </div>`;

  // ── HISTÓRICO PARA OS NOVOS GRÁFICOS (12 meses, ascendente) ──
  const hist = buildInsightsHistory(currentYear, currentMonth, INSIGHTS_HISTORY_MONTHS);
  const cur  = hist[hist.length - 1];
  const prev = hist[hist.length - 2] || null;

  const chartsHtml = [
    buildEvolucaoMensalHtml(hist),
    buildReceitasDespesasHtml(hist, salario),
    buildEvolucaoSaldoHtml(hist, salario),
    buildComparacao12MesesHtml(hist),
    buildCategoriasEmAltaEQuedaHtml(cur, prev),
    buildDiasQueMaisGastaHtml(),
  ].join('');

  document.getElementById('statsContainer').innerHTML = budgetHtml + chartsHtml + categoriaCardHtml;
  triggerChartReveal(document.getElementById('statsContainer'));
}

// ═══════════════════════════════════════════════
