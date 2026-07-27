// ═══════════════════════════════════════════════════════════
// MOTOR DE INSIGHTS FINANCEIROS
// ═══════════════════════════════════════════════════════════
// 100% baseado em regras determinísticas sobre expenses[] —
// nenhuma IA, nenhuma chamada externa, nenhum dado novo é
// criado ou gravado. Cada regra é uma função pura que recebe
// os dados já calculados (mesmas fontes de Despesas/Relatório/
// Ferramentas/Início) e devolve um insight, ou `null` quando
// não há dados suficientes para sustentar a afirmação.
// ═══════════════════════════════════════════════════════════

const INSIGHTS_HISTORY_MONTHS = 12;

// ── HELPERS DE DATA/TEXTO ──
function daysInMonthCalc(y, m) { return new Date(y, m + 1, 0).getDate(); }

function monthLabelPT(y, m, short) {
  const full  = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const shortN = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return short ? `${shortN[m]}/${y}` : `${full[m]} de ${y}`;
}

const WEEKDAY_NAMES = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

function insight(id, tone, icon, priority, title, text) {
  return { id, tone, icon, priority, title, text };
}

// Monta o histórico dos últimos `n` meses (ascendente: mais antigo → mais novo),
// terminando no mês em exibição. Reaproveita getMonthTotals (já usado pela
// aba Início) para não duplicar a lógica de agregação.
function buildInsightsHistory(y, m, n) {
  const hist = [];
  let iy = y, im = m;
  for (let i = 0; i < n; i++) {
    hist.unshift({ year: iy, month: im, key: getMonthKey(iy, im), ...getMonthTotals(iy, im) });
    im--;
    if (im < 0) { im = 11; iy--; }
  }
  return hist;
}

// Parcela atual / restante de uma despesa parcelada, em um mês de referência
function getParcelaInfo(exp, y, m) {
  const startDate = new Date(exp.dataOriginal + 'T12:00:00');
  const startKey  = getMonthKey(startDate.getFullYear(), startDate.getMonth());
  const [sy, sm]  = startKey.split('-').map(Number);
  const parcAtual = (y - sy) * 12 + (m - sm) + 1;
  return { parcAtual, restante: (exp.totalParcelas || 0) - parcAtual };
}

// ═══════════════════════════════════════════════════════════
// REGRAS INDIVIDUAIS
// ═══════════════════════════════════════════════════════════

// R01 — sem nenhuma despesa ainda no mês
function ruleNoData(cur) {
  if (cur.count > 0) return null;
  return insight('no-data', 'neutral', 'i-sparkle', 1, 'Nada por aqui ainda',
    `Você ainda não lançou despesas em ${monthLabelPT(cur.year, cur.month, true)}. Assim que registrar algo, os insights aparecem automaticamente aqui.`);
}

// R02 — comparação direta com o mês anterior
function ruleCompareLastMonth(cur, prev) {
  if (cur.count === 0 || !prev || prev.count === 0) return null;
  const diff = cur.total - prev.total;
  if (Math.abs(diff) < 0.01) {
    return insight('cmp-equal', 'neutral', 'i-trend-up', 20, 'Gasto estável',
      `Você gastou praticamente o mesmo valor de ${monthLabelPT(prev.year, prev.month, true)}: ${formatBRL(cur.total)}.`);
  }
  const pct = prev.total > 0 ? Math.round((Math.abs(diff) / prev.total) * 100) : 100;
  if (diff > 0) {
    return insight('cmp-more', 'bad', 'i-trend-up', 5, 'Gastou mais que o mês passado',
      `Você gastou ${formatBRL(diff)} a mais (${pct}%) do que em ${monthLabelPT(prev.year, prev.month, true)}.`);
  }
  return insight('cmp-less', 'good', 'i-trend-down', 5, 'Economizou em relação ao mês passado',
    `Você gastou ${formatBRL(Math.abs(diff))} a menos (${pct}%) do que em ${monthLabelPT(prev.year, prev.month, true)}.`);
}

// R03 — categoria com maior gasto do mês
function ruleTopCategory(cur) {
  if (cur.count === 0) return null;
  const entries = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const [catId, val] = entries[0];
  const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[9];
  const pct = cur.total > 0 ? Math.round((val / cur.total) * 100) : 0;
  return insight('top-cat', 'info', 'i-bar-chart', 11, 'Maior categoria de gastos',
    `${cat.emoji} ${sanitize(cat.label)} concentra ${formatBRL(val)} (${pct}%) dos seus gastos este mês.`);
}

// R04 — concentração excessiva numa única categoria
function ruleCategoryConcentration(cur) {
  if (cur.count === 0) return null;
  const entries = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const [catId, val] = entries[0];
  const pct = cur.total > 0 ? Math.round((val / cur.total) * 100) : 0;
  if (pct < 50) return null;
  const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[9];
  return insight('cat-concentration', 'warning', 'i-alert', 8, 'Gastos concentrados',
    `Mais da metade do seu orçamento este mês está em uma única categoria: ${cat.emoji} ${sanitize(cat.label)} (${pct}%). Diversificar reduz o risco de aperto financeiro.`);
}

// R05 — categoria que mais cresceu vs mês passado
function ruleCategoryGrowth(cur, prev) {
  if (cur.count === 0 || !prev || prev.count === 0) return null;
  let best = null;
  Object.keys(cur.byCat).forEach(catId => {
    const antes = prev.byCat[catId] || 0;
    const agora = cur.byCat[catId] || 0;
    if (antes <= 0) return; // categoria nova entra em outra regra
    const diff = agora - antes;
    const pct  = Math.round((diff / antes) * 100);
    if (diff > 0 && (!best || diff > best.diff)) best = { catId, diff, pct };
  });
  if (!best || best.diff < 20) return null;
  const cat = CATEGORIES.find(c => c.id === best.catId) || CATEGORIES[9];
  return insight('cat-growth', 'warning', 'i-trend-up', 13, 'Categoria em alta',
    `O gasto com ${cat.emoji} ${sanitize(cat.label)} subiu ${formatBRL(best.diff)} (${best.pct}%) em relação ao mês passado.`);
}

// R06 — categoria que mais caiu vs mês passado
function ruleCategoryDrop(cur, prev) {
  if (!prev || prev.count === 0) return null;
  let best = null;
  Object.keys(prev.byCat).forEach(catId => {
    const antes = prev.byCat[catId] || 0;
    const agora = cur.byCat[catId] || 0;
    if (antes <= 0) return;
    const diff = antes - agora;
    const pct  = Math.round((diff / antes) * 100);
    if (diff > 0 && (!best || diff > best.diff)) best = { catId, diff, pct };
  });
  if (!best || best.diff < 20) return null;
  const cat = CATEGORIES.find(c => c.id === best.catId) || CATEGORIES[9];
  return insight('cat-drop', 'good', 'i-trend-down', 14, 'Categoria em queda',
    `O gasto com ${cat.emoji} ${sanitize(cat.label)} caiu ${formatBRL(best.diff)} (${best.pct}%) em relação ao mês passado.`);
}

// R07 — categoria nova este mês (não existia no mês passado)
function ruleNewCategory(cur, prev) {
  if (cur.count === 0 || !prev || prev.count === 0) return null;
  const catId = Object.keys(cur.byCat).find(c => !(prev.byCat[c] > 0));
  if (!catId) return null;
  const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[9];
  return insight('cat-new', 'info', 'i-sparkle', 24, 'Nova categoria de gasto',
    `Você começou a gastar com ${cat.emoji} ${sanitize(cat.label)} este mês — categoria que não aparecia em ${monthLabelPT(prev.year, prev.month, true)}.`);
}

// R08 — categoria que sumiu (tinha gasto, agora não tem mais)
function ruleCategoryGone(cur, prev) {
  if (!prev || prev.count === 0) return null;
  const catId = Object.keys(prev.byCat).find(c => prev.byCat[c] > 0 && !(cur.byCat[c] > 0));
  if (!catId) return null;
  const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[9];
  return insight('cat-gone', 'good', 'i-check', 23, 'Categoria sem gasto este mês',
    `Você não teve nenhum gasto com ${cat.emoji} ${sanitize(cat.label)} este mês (tinha ${formatBRL(prev.byCat[catId])} em ${monthLabelPT(prev.year, prev.month, true)}).`);
}

// R09 — média diária de gastos
function ruleDailyAverage(cur, daysPassed) {
  if (cur.count === 0 || daysPassed <= 0) return null;
  const avg = cur.total / daysPassed;
  return insight('daily-avg', 'neutral', 'i-clock', 16, 'Média diária de gastos',
    `Considerando os dias já passados, você está gastando em média ${formatBRL(avg)} por dia neste mês.`);
}

// R10 — previsão de fechamento do mês
function ruleForecast(cur, prev, salario, isRealCurrentMonth, daysPassed, totalDays) {
  if (!isRealCurrentMonth || cur.count === 0 || daysPassed < 3 || daysPassed >= totalDays) return null;
  const avgDaily = cur.total / daysPassed;
  const proj = avgDaily * totalDays;
  let extra = '';
  if (salario > 0 && proj > salario) {
    extra = ` Isso ultrapassaria sua renda informada em ${formatBRL(proj - salario)}.`;
  } else if (prev && prev.total > 0) {
    const pct = Math.round(((proj - prev.total) / prev.total) * 100);
    if (Math.abs(pct) >= 5) extra = ` Seria ${Math.abs(pct)}% ${pct > 0 ? 'a mais' : 'a menos'} do que em ${monthLabelPT(prev.year, prev.month, true)}.`;
  }
  const tone = (salario > 0 && proj > salario) ? 'warning' : 'info';
  return insight('forecast', tone, 'i-target', 9, 'Previsão para o fim do mês',
    `No ritmo atual de gastos, você deve fechar o mês em torno de ${formatBRL(proj)}.${extra}`);
}

// R11 — gastos acima/abaixo da média histórica
function ruleVsHistoricAverage(cur, priorActiveMonths) {
  if (cur.count === 0 || priorActiveMonths.length < 3) return null;
  const avg = priorActiveMonths.reduce((s, h) => s + h.total, 0) / priorActiveMonths.length;
  if (avg <= 0) return null;
  const pct = Math.round(((cur.total - avg) / avg) * 100);
  if (pct >= 15) {
    return insight('above-avg', 'warning', 'i-alert', 10, 'Gastos acima da média',
      `Você está gastando ${pct}% acima da sua média dos últimos ${priorActiveMonths.length} meses (${formatBRL(avg)}).`);
  }
  if (pct <= -15) {
    return insight('below-avg', 'good', 'i-piggy', 10, 'Gastos abaixo da média',
      `Você está gastando ${Math.abs(pct)}% abaixo da sua média dos últimos ${priorActiveMonths.length} meses (${formatBRL(avg)}).`);
  }
  return null;
}

// R12 — ticket médio por lançamento
function ruleAvgTicket(cur) {
  if (cur.count === 0) return null;
  const avg = cur.total / cur.count;
  return insight('avg-ticket', 'neutral', 'i-dollar', 19, 'Ticket médio por despesa',
    `Cada despesa lançada este mês custou em média ${formatBRL(avg)}, em ${cur.count} lançamento(s).`);
}

// R13 — maior despesa já registrada (histórico completo)
function ruleMostExpensiveEver(allExpenses) {
  if (!allExpenses.length) return null;
  const top = allExpenses.reduce((max, e) => (e.valor > (max ? max.valor : -1) ? e : max), null);
  if (!top) return null;
  return insight('max-ever', 'info', 'i-star', 27, 'Maior despesa já registrada',
    `A maior despesa que você já lançou foi "${sanitize(top.descricao)}", no valor de ${formatBRL(top.valor)}.`);
}

// R14 — padrão de dia da semana
function ruleWeekdayPattern(allExpenses) {
  if (allExpenses.length < 6) return null;
  const sums = [0, 0, 0, 0, 0, 0, 0];
  let counted = 0;
  allExpenses.forEach(e => {
    if (!e.dataOriginal) return;
    const d = new Date(e.dataOriginal + 'T12:00:00');
    if (isNaN(d.getTime())) return;
    sums[d.getDay()] += e.valor;
    counted++;
  });
  if (counted < 6) return null;
  let bestDay = 0;
  for (let i = 1; i < 7; i++) if (sums[i] > sums[bestDay]) bestDay = i;
  if (sums[bestDay] <= 0) return null;
  return insight('weekday-pattern', 'info', 'i-calendar', 26, 'Padrão de gastos na semana',
    `Suas despesas se concentram mais em lançamentos com vencimento às ${WEEKDAY_NAMES[bestDay]}s, somando ${formatBRL(sums[bestDay])} no histórico.`);
}

// R15 — sequência de meses economizando (gastando menos que a renda)
function ruleSavingsStreak(hist, salario) {
  if (salario <= 0) return null;
  let streak = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    if (h.count === 0) break;
    if (h.total < salario) streak++; else break;
  }
  if (streak < 2) return null;
  return insight('streak-save', 'good', 'i-flame', 3, 'Sequência de economia',
    `Você está gastando menos que sua renda informada há ${streak} meses seguidos. Continue assim!`);
}

// R16 — sequência de meses estourando o orçamento
function ruleOverspendStreak(hist, salario) {
  if (salario <= 0) return null;
  let streak = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    if (h.count === 0) break;
    if (h.total > salario) streak++; else break;
  }
  if (streak < 2) return null;
  return insight('streak-overspend', 'bad', 'i-alert', 2, 'Sequência de estouro de orçamento',
    `Suas despesas superam a renda informada há ${streak} meses seguidos. Vale revisar os gastos fixos e variáveis.`);
}

// R17 — mês 100% quitado
function ruleAllPaid(cur) {
  if (cur.count === 0 || cur.pending > 0.005) return null;
  return insight('all-paid', 'good', 'i-check', 7, 'Mês 100% quitado',
    `Você já pagou todas as ${cur.count} despesa(s) deste mês. Parabéns pela organização!`);
}

// R18 — pagamentos atrasados em relação ao andamento do mês
function rulePaymentBehind(cur, daysPassed, totalDays, isRealCurrentMonth) {
  if (!isRealCurrentMonth || cur.count === 0 || cur.total <= 0) return null;
  const progressoMes = daysPassed / totalDays;
  const progressoPago = cur.paid / cur.total;
  if (progressoMes >= 0.6 && progressoPago < 0.3) {
    return insight('payment-behind', 'warning', 'i-alert', 6, 'Pagamentos atrasando',
      `O mês já passou de ${Math.round(progressoMes * 100)}%, mas só ${Math.round(progressoPago * 100)}% das despesas foram pagas até agora.`);
  }
  return null;
}

// R19 — peso das contas fixas no total
function ruleFixedShare(cur) {
  if (cur.count === 0) return null;
  const fixedTotal = cur.disp.filter(e => e.tipo === 'fixo').reduce((s, e) => s + e.valor, 0);
  const pct = cur.total > 0 ? Math.round((fixedTotal / cur.total) * 100) : 0;
  if (pct < 40) return null;
  return insight('fixed-share', 'neutral', 'i-wallet', 18, 'Peso das contas fixas',
    `${pct}% do seu gasto este mês vem de contas fixas recorrentes (${formatBRL(fixedTotal)}).`);
}

// R20 — compromisso futuro em parcelas ativas
function ruleInstallmentBurden(y, m) {
  let total = 0, count = 0;
  expenses.forEach(exp => {
    if (exp.tipo !== 'parcelado') return;
    const { restante } = getParcelaInfo(exp, y, m);
    if (restante > 0) { total += restante * exp.valor; count++; }
  });
  if (count === 0 || total <= 0) return null;
  return insight('installment-burden', 'neutral', 'i-layers', 17, 'Compromissos futuros em parcelas',
    `Você tem ${formatBRL(total)} comprometidos em ${count} parcelamento(s) ativo(s) para os próximos meses.`);
}

// R21 — parcelamentos terminando este mês
function ruleInstallmentsEnding(y, m) {
  let sumVal = 0, count = 0;
  expenses.forEach(exp => {
    if (exp.tipo !== 'parcelado') return;
    const { parcAtual } = getParcelaInfo(exp, y, m);
    if (parcAtual === exp.totalParcelas) { sumVal += exp.valor; count++; }
  });
  if (count === 0) return null;
  return insight('installments-ending', 'good', 'i-party', 4, 'Parcelamentos terminando',
    `${count} parcelamento(s) chegam ao fim este mês, liberando ${formatBRL(sumVal)} no seu orçamento a partir do próximo mês.`);
}

// R22 — contas vencidas e não pagas
function ruleOverdue(cur) {
  if (cur.count === 0) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let sumOverdue = 0, count = 0;
  cur.disp.forEach(e => {
    if (e.paid) return;
    const parts = e.dateStr.split('/');
    if (parts.length < 3) return;
    const due = new Date(parts[2], parts[1] - 1, parts[0]);
    if (due < today) { sumOverdue += e.valor; count++; }
  });
  if (count === 0) return null;
  return insight('overdue', 'bad', 'i-alert', 1, 'Contas vencidas',
    `Você tem ${count} conta(s) vencida(s) somando ${formatBRL(sumOverdue)}. Regularizar evita juros e multas.`);
}

// R23 — melhor mês dos últimos N (menor gasto)
function ruleBestMonth(cur, priorActiveMonths) {
  if (cur.count === 0 || priorActiveMonths.length < 3) return null;
  const min = Math.min(...priorActiveMonths.map(h => h.total));
  if (cur.total >= min) return null;
  return insight('best-month', 'good', 'i-star', 4, 'Seu melhor mês',
    `Este é o mês com o menor gasto total entre os últimos ${priorActiveMonths.length + 1} meses registrados!`);
}

// R24 — pior mês dos últimos N (maior gasto)
function ruleWorstMonth(cur, priorActiveMonths) {
  if (cur.count === 0 || priorActiveMonths.length < 3) return null;
  const max = Math.max(...priorActiveMonths.map(h => h.total));
  if (cur.total <= max) return null;
  return insight('worst-month', 'warning', 'i-alert', 6, 'Seu mês de maior gasto',
    `Este é o mês com o maior gasto total entre os últimos ${priorActiveMonths.length + 1} meses registrados. Vale revisar o que pesou mais.`);
}

// R25 — total acumulado no ano
function ruleYearToDate(y, m) {
  if (m === 0) return null; // janeiro ainda não tem "mês anterior no ano"
  let totalYear = 0, mesesComGasto = 0;
  for (let mm = 0; mm <= m; mm++) {
    const t = getMonthTotals(y, mm).total;
    totalYear += t;
    if (t > 0) mesesComGasto++;
  }
  if (totalYear <= 0) return null;
  const avgMonth = totalYear / (m + 1);
  return insight('ytd', 'neutral', 'i-bar-chart', 21, `Total acumulado em ${y}`,
    `Você já somou ${formatBRL(totalYear)} em despesas em ${y}, uma média de ${formatBRL(avgMonth)} por mês.`);
}

// R26 — primeiro mês de uso (pouco histórico ainda)
function ruleFirstMonth(cur, priorActiveMonths) {
  if (cur.count === 0 || priorActiveMonths.length > 0) return null;
  return insight('first-month', 'info', 'i-sparkle', 25, 'Primeiros passos',
    'Este é o seu primeiro mês com despesas registradas por aqui. Continue lançando para desbloquear mais insights nos próximos meses!');
}

// ═══════════════════════════════════════════════════════════
// ORQUESTRAÇÃO: roda todas as regras e devolve os insights válidos,
// já ordenados por prioridade (menor número = mais relevante)
// ═══════════════════════════════════════════════════════════
function generateInsights(y, m) {
  const hist = buildInsightsHistory(y, m, INSIGHTS_HISTORY_MONTHS);
  const cur  = hist[hist.length - 1];
  const prev = hist[hist.length - 2] || null;
  const priorActiveMonths = hist.slice(0, -1).filter(h => h.count > 0);

  let salario = 0;
  try { salario = parseBRL(localStorage.getItem('sim_salario') || ''); } catch (e) {}

  const isRealCurrentMonth = (y === new Date().getFullYear() && m === new Date().getMonth());
  const totalDays  = daysInMonthCalc(y, m);
  const daysPassed = isRealCurrentMonth ? new Date().getDate() : totalDays;

  const results = [
    ruleNoData(cur),
    ruleCompareLastMonth(cur, prev),
    ruleTopCategory(cur),
    ruleCategoryConcentration(cur),
    ruleCategoryGrowth(cur, prev),
    ruleCategoryDrop(cur, prev),
    ruleNewCategory(cur, prev),
    ruleCategoryGone(cur, prev),
    ruleDailyAverage(cur, daysPassed),
    ruleForecast(cur, prev, salario, isRealCurrentMonth, daysPassed, totalDays),
    ruleVsHistoricAverage(cur, priorActiveMonths),
    ruleAvgTicket(cur),
    ruleMostExpensiveEver(expenses),
    ruleWeekdayPattern(expenses),
    ruleSavingsStreak(hist, salario),
    ruleOverspendStreak(hist, salario),
    ruleAllPaid(cur),
    rulePaymentBehind(cur, daysPassed, totalDays, isRealCurrentMonth),
    ruleFixedShare(cur),
    ruleInstallmentBurden(y, m),
    ruleInstallmentsEnding(y, m),
    ruleOverdue(cur),
    ruleBestMonth(cur, priorActiveMonths),
    ruleWorstMonth(cur, priorActiveMonths),
    ruleYearToDate(y, m),
    ruleFirstMonth(cur, priorActiveMonths),
  ].filter(Boolean);

  results.sort((a, b) => a.priority - b.priority);
  return results;
}

// ═══════════════════════════════════════════════════════════
