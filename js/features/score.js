// ═══════════════════════════════════════════════════════════
// SCORE FINANCEIRO PREMIUM
// ═══════════════════════════════════════════════════════════
// Nota de 0 a 100 calculada por um motor de regras/pesos fixo —
// sem IA, sem rede, 100% offline — sobre os mesmos dados que já
// alimentam o resto do app (expenses[], renda e meta salvas
// localmente). O score sempre representa o mês REAL atual (não
// o mês que o usuário está navegando no restante do dashboard),
// para não "pular" quando ele só está olhando um mês antigo.
//
// Composição (soma = 100 pontos):
//   Contas pagas ......... 15
//   Pontualidade/atrasos . 15
//   Economia ............. 15
//   Saldo do mês ......... 10
//   Metas de economia .... 10
//   Frequência de gastos . 10
//   Parcelamentos ........ 10
//   Gastos supérfluos ..... 15
// ═══════════════════════════════════════════════════════════

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function getScoreBand(score) {
  if (score >= 85) return { label: 'Excelente',  color: '#16a34a' };
  if (score >= 70) return { label: 'Muito bom',  color: '#65a30d' };
  if (score >= 50) return { label: 'Regular',    color: '#f59e0b' };
  if (score >= 30) return { label: 'Atenção',    color: '#f97316' };
  return               { label: 'Crítico',    color: '#dc2626' };
}

function computeInstallmentBurdenValue(y, m) {
  let total = 0;
  expenses.forEach(exp => {
    if (exp.tipo !== 'parcelado') return;
    const { restante } = getParcelaInfo(exp, y, m);
    if (restante > 0) total += restante * exp.valor;
  });
  return total;
}

function getStoredScore() {
  try {
    const v = parseInt(localStorage.getItem('financial_score_last'), 10);
    return isNaN(v) ? null : v;
  } catch (e) { return null; }
}
function storeScore(score) {
  try { localStorage.setItem('financial_score_last', String(score)); } catch (e) {}
}

// ── MOTOR PRINCIPAL ──
function computeFinancialScore() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const cur  = getMonthTotals(y, m);
  const hist = buildInsightsHistory(y, m, INSIGHTS_HISTORY_MONTHS);
  const priorActive = hist.slice(0, -1).filter(h => h.count > 0);

  let salario = 0, metaPct = 0;
  try {
    salario = parseBRL(localStorage.getItem('sim_salario') || '');
    metaPct = parseFloat(localStorage.getItem('sim_meta_pct')) || 0;
  } catch (e) {}

  const today = new Date(); today.setHours(0, 0, 0, 0);
  let overdueCount = 0, pendingCount = 0;
  cur.disp.forEach(e => {
    if (e.paid) return;
    pendingCount++;
    const parts = e.dateStr.split('/');
    if (parts.length < 3) return;
    const due = new Date(parts[2], parts[1] - 1, parts[0]);
    if (due < today) overdueCount++;
  });

  const components = [];

  // 1 — Contas pagas (15)
  components.push({
    key: 'pagas', label: 'Contas pagas', weight: 15,
    frac: cur.total > 0 ? clamp01(cur.paid / cur.total) : 0.75,
    meta: { pending: cur.pending },
  });

  // 2 — Pontualidade / atrasos (15)
  components.push({
    key: 'atrasos', label: 'Pontualidade', weight: 15,
    frac: cur.count === 0 ? 0.75 : (pendingCount > 0 ? clamp01(1 - overdueCount / pendingCount) : 1),
    meta: { overdueCount },
  });

  // 3 — Economia (15): meta implícita = guardar 20% da renda
  {
    let frac = 0.6; // neutro quando não há renda cadastrada
    if (salario > 0) {
      const economiaMes = Math.max(salario - cur.total, 0);
      frac = clamp01((economiaMes / salario) / 0.20);
    }
    components.push({ key: 'economia', label: 'Economia', weight: 15, frac, meta: { salario } });
  }

  // 4 — Saldo do mês (10)
  {
    let frac;
    if (salario > 0) {
      const saldoAtual = salario - cur.total;
      frac = clamp01(0.5 + saldoAtual / (2 * salario));
    } else {
      frac = cur.total > 0 ? clamp01(1 - (cur.pending / cur.total) * 0.5) : 0.75;
    }
    components.push({ key: 'saldo', label: 'Saldo do mês', weight: 10, frac });
  }

  // 5 — Metas de economia (10)
  {
    let frac = 0.7; // neutro quando não há meta definida
    if (salario > 0 && metaPct > 0) {
      const economiaMes = Math.max(salario - cur.total, 0);
      const valorMeta = (salario * metaPct) / 100;
      frac = valorMeta > 0 ? clamp01(economiaMes / valorMeta) : 0.75;
    }
    components.push({ key: 'metas', label: 'Metas de economia', weight: 10, frac });
  }

  // 6 — Frequência de gastos (10): muitos lançamentos a mais que o normal = alerta de impulsividade
  {
    let frac = 0.75, avgCount = null;
    if (priorActive.length >= 2 && cur.count > 0) {
      avgCount = priorActive.reduce((s, h) => s + h.count, 0) / priorActive.length;
      const ratio = avgCount > 0 ? cur.count / avgCount : 1;
      frac = ratio <= 1.3 ? 1 : clamp01(1 - (ratio - 1.3) * 0.5);
    }
    components.push({ key: 'frequencia', label: 'Frequência de gastos', weight: 10, frac, meta: { avgCount } });
  }

  // 7 — Parcelamentos (10): quanto do futuro já está comprometido
  {
    const burden = computeInstallmentBurdenValue(y, m);
    let frac = 1;
    if (burden > 0) {
      frac = salario > 0
        ? clamp01(1 - burden / (salario * 3))
        : clamp01(1 - burden / (Math.max(cur.total, 1) * 6));
    }
    components.push({ key: 'parcelamentos', label: 'Parcelamentos', weight: 10, frac, meta: { burden } });
  }

  // 8 — Gastos supérfluos (15): peso de categorias discricionárias no total
  {
    let frac = 0.75, discPct = null;
    if (cur.total > 0) {
      const discretionary = (cur.byCat.lazer || 0) + (cur.byCat.compras || 0) + (cur.byCat.outros || 0);
      discPct = discretionary / cur.total;
      frac = clamp01(1 - discPct / 0.5);
    }
    components.push({ key: 'desnecessarios', label: 'Gastos supérfluos', weight: 15, frac, meta: { discPct } });
  }

  let total = 0;
  components.forEach(c => { c.earned = c.frac * c.weight; total += c.earned; });
  const score = Math.round(Math.max(0, Math.min(100, total)));

  return { score, components, cur, salario, metaPct, y, m };
}

// ── TEXTOS: EXPLICAÇÃO E DICAS ──
function buildScoreExplanation(data) {
  const band = getScoreBand(data.score);
  const sorted = [...data.components].sort((a, b) => a.frac - b.frac);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  let txt = `Sua pontuação está ${band.label.toLowerCase()} (${data.score}/100).`;
  if (best && best.frac >= 0.8) txt += ` O ponto mais forte é "${best.label}".`;
  if (worst && worst.frac < 0.7) txt += ` O que mais pesa contra é "${worst.label}".`;
  return txt;
}

function buildScoreTips(data) {
  const tips = [];
  const byKey = {};
  data.components.forEach(c => { byKey[c.key] = c; });

  const c = byKey.pagas;
  if (c && c.frac < 0.7) tips.push({ frac: c.frac, text: `Você ainda tem ${formatBRL(c.meta.pending)} em despesas pendentes este mês — pague o quanto puder para melhorar sua pontualidade.` });

  const a = byKey.atrasos;
  if (a && a.frac < 0.7) tips.push({ frac: a.frac, text: `Regularize ${a.meta.overdueCount > 1 ? 'as ' + a.meta.overdueCount + ' contas vencidas' : 'a conta vencida'} o quanto antes para evitar juros e multas.` });

  const e = byKey.economia;
  if (e && e.frac < 0.7) tips.push({ frac: e.frac, text: e.meta.salario > 0 ? 'Tente guardar pelo menos 20% da sua renda por mês — hoje você está guardando menos que isso.' : 'Cadastre sua renda na aba Ferramentas para acompanhar sua economia real.' });

  const s = byKey.saldo;
  if (s && s.frac < 0.6) tips.push({ frac: s.frac, text: 'Suas despesas estão consumindo boa parte (ou mais) da sua renda — revise gastos variáveis para reequilibrar o saldo.' });

  const g = byKey.metas;
  if (g && g.frac < 0.7) tips.push({ frac: g.frac, text: data.metaPct > 0 ? 'Você ainda está longe de bater sua meta de economia deste mês — reduzir gastos supérfluos ajuda a se aproximar dela.' : 'Defina uma meta de economia (% da renda) na aba Ferramentas para ter um alvo claro.' });

  const f = byKey.frequencia;
  if (f && f.frac < 0.7 && f.meta.avgCount) tips.push({ frac: f.frac, text: `Você fez ${data.cur.count} lançamentos este mês, bem mais que sua média de ~${Math.round(f.meta.avgCount)} — fique atento a compras por impulso.` });

  const p = byKey.parcelamentos;
  if (p && p.frac < 0.7) tips.push({ frac: p.frac, text: `Você tem ${formatBRL(p.meta.burden)} comprometidos em parcelas futuras — evite novos parcelamentos até reduzir esse valor.` });

  const d = byKey.desnecessarios;
  if (d && d.frac < 0.7) tips.push({ frac: d.frac, text: 'Uma boa parte do seu gasto está em categorias como lazer e compras — reduzir esse percentual fortalece sua reserva.' });

  tips.sort((x, y2) => x.frac - y2.frac);
  return tips.slice(0, 3).map(t => t.text);
}

// ═══════════════════════════════════════════════════════════
