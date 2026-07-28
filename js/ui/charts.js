// ═══════════════════════════════════════════════════════════
// TOOLKIT DE GRÁFICOS — SVG puro, sem libs externas
// ═══════════════════════════════════════════════════════════
// Usado pela tela de Relatório (e reaproveitável em qualquer
// outra tela). Todo gráfico é envolvido em um
// <div class="chart-reveal-wrap"> que começa "fechado" via
// clip-path e é revelado com uma transição suave quando
// triggerChartReveal() roda — dá a sensação de o gráfico
// "desenhar" na tela sem precisar medir comprimento de path.
// ═══════════════════════════════════════════════════════════

let _chartUidSeq = 0;

function triggerChartReveal(root) {
  const scope = root || document;
  scope.querySelectorAll('.chart-reveal-wrap').forEach((el, i) => {
    el.classList.remove('revealed');
    el.style.transitionDelay = Math.min(i * 0.08, 0.5).toFixed(2) + 's';
  });
  requestAnimationFrame(() => {
    scope.querySelectorAll('.chart-reveal-wrap').forEach(el => el.classList.add('revealed'));
  });
}

// ── GRÁFICO DE LINHA + ÁREA (evolução mensal, saldo) ──
function buildLineAreaChart(values, labels, opts) {
  opts = opts || {};
  if (!values || !values.length) return '';
  const uid = opts.uid || ('la' + (_chartUidSeq++));
  const W = opts.width || 320, H = opts.height || 130, PAD_X = 8, PAD_Y = 12;
  const dual = !!opts.dualColor;

  const min = Math.min(0, ...values);
  const max = Math.max(0.0001, ...values);
  const range = (max - min) || 1;
  const stepX = values.length > 1 ? (W - PAD_X * 2) / (values.length - 1) : 0;
  const toY = v => H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2);
  const pts = values.map((v, i) => [PAD_X + i * stepX, toY(v)]);

  let linePath = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    linePath += ` C ${cx.toFixed(1)} ${y0.toFixed(1)}, ${cx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const zeroY = toY(0);
  const lastX = pts[pts.length - 1][0], firstX = pts[0][0];
  const areaPath = `${linePath} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;

  const baseColor = opts.color || '#4338ca';
  let defs = '', fills = '';
  if (dual) {
    defs = `
      <clipPath id="clipPos${uid}"><rect x="0" y="0" width="${W}" height="${zeroY.toFixed(1)}"/></clipPath>
      <clipPath id="clipNeg${uid}"><rect x="0" y="${zeroY.toFixed(1)}" width="${W}" height="${Math.max(H - zeroY, 0).toFixed(1)}"/></clipPath>`;
    fills = `
      <path d="${areaPath}" fill="var(--green)" opacity="0.16" clip-path="url(#clipPos${uid})"/>
      <path d="${areaPath}" fill="var(--red)" opacity="0.16" clip-path="url(#clipNeg${uid})"/>`;
  } else {
    defs = `<linearGradient id="grad${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${baseColor}" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="${baseColor}" stop-opacity="0"/>
    </linearGradient>`;
    fills = `<path d="${areaPath}" fill="url(#grad${uid})" stroke="none"/>`;
  }

  const zeroLine = opts.showZeroLine
    ? `<line x1="${PAD_X}" y1="${zeroY.toFixed(1)}" x2="${W - PAD_X}" y2="${zeroY.toFixed(1)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>`
    : '';

  const lineColor = dual ? (values[values.length - 1] >= 0 ? '#16a34a' : 'var(--red)') : baseColor;
  const lastPt = pts[pts.length - 1];
  const dot = `<circle cx="${lastPt[0].toFixed(1)}" cy="${lastPt[1].toFixed(1)}" r="4.5" fill="${lineColor}" stroke="var(--card)" stroke-width="2"/>`;

  const labelsHtml = labels
    ? `<div class="stat-chart-labels">${labels.map((l, i) => `<span${opts.highlightLast && i === labels.length - 1 ? ' class="hl"' : ''}>${sanitize(l)}</span>`).join('')}</div>`
    : '';

  return `
    <div class="stat-chart-block">
      <div class="chart-reveal-wrap">
        <svg class="stat-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>${defs}</defs>
          ${zeroLine}
          ${fills}
          <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${dot}
        </svg>
      </div>
      ${labelsHtml}
    </div>`;
}

// ── GRÁFICO DE BARRAS (comparação mensal, dias da semana) ──
function buildBarChart(values, labels, opts) {
  opts = opts || {};
  if (!values || !values.length) return '';
  const W = opts.width || 320, H = opts.height || 130, PAD_X = 8, PAD_Y = 10;
  const GAP = opts.gap != null ? opts.gap : 6;
  const n = values.length;
  const max = Math.max(0.0001, ...values, opts.guideValue || 0);
  const barW = (W - PAD_X * 2 - GAP * (n - 1)) / n;

  const bars = values.map((v, i) => {
    const h = Math.max((Math.max(v, 0) / max) * (H - PAD_Y * 2), v > 0 ? 2 : 0);
    const x = PAD_X + i * (barW + GAP);
    const y = H - PAD_Y - h;
    const isHl = i === opts.highlightIndex;
    const color = opts.colorFn ? opts.colorFn(v, i) : (isHl ? (opts.highlightColor || '#7c3aed') : (opts.color || '#4338ca'));
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(barW / 3, 5).toFixed(1)}" fill="${color}" opacity="${isHl ? 1 : 0.72}"/>`;
  }).join('');

  let guideLine = '';
  if (opts.guideValue != null) {
    const gy = H - PAD_Y - (opts.guideValue / max) * (H - PAD_Y * 2);
    guideLine = `<line x1="${PAD_X}" y1="${gy.toFixed(1)}" x2="${W - PAD_X}" y2="${gy.toFixed(1)}" stroke="${opts.guideColor || 'var(--text-muted)'}" stroke-width="1.4" stroke-dasharray="5,4"/>`;
  }

  const labelsHtml = labels
    ? `<div class="stat-chart-labels">${labels.map((l, i) => `<span${i === opts.highlightIndex ? ' class="hl"' : ''}>${sanitize(l)}</span>`).join('')}</div>`
    : '';

  return `
    <div class="stat-chart-block">
      <div class="chart-reveal-wrap">
        <svg class="stat-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          ${guideLine}
          ${bars}
        </svg>
      </div>
      ${labelsHtml}
      ${opts.guideLabel ? `<div class="stat-chart-guide-label"><span class="dot" style="background:${opts.guideColor || 'var(--text-muted)'}"></span>${sanitize(opts.guideLabel)}</div>` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
