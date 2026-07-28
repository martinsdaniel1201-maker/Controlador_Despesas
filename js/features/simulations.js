// ═══════════════════════════════════════════════════════════
// MOTOR DE SIMULAÇÕES FINANCEIRAS
// ═══════════════════════════════════════════════════════════
// Matemática financeira pura (juros compostos, amortização,
// projeção de saldo) — sem IA, sem rede, 100% offline. Cada
// função de cenário devolve o mesmo "contrato" de saída:
//   { impactoMensal, impactoAnual, saldoPrevisto,
//     tempoRecuperacao, tempoLabel, serie, serieLabel, tone,
//     resumo, detalhes[] }
// para que a tela possa renderizar qualquer cenário de forma
// genérica e comparar cenários entre si.
// ═══════════════════════════════════════════════════════════

const SIM_TYPES = {
  celular:        { label: 'Comprar celular',        icon: 'i-zap',       group: 'compra' },
  carro:          { label: 'Comprar carro',          icon: 'i-car',       group: 'compra' },
  financiamento:  { label: 'Financiamento',          icon: 'i-bank',      group: 'financiamento' },
  poupanca:       { label: 'Guardar dinheiro',       icon: 'i-piggy',     group: 'poupanca' },
  dividas:        { label: 'Quitar dívidas',         icon: 'i-layers',    group: 'dividas' },
  aumento:        { label: 'Aumento salarial',       icon: 'i-trend-up',  group: 'salario' },
  reducaoSalario: { label: 'Redução salarial',       icon: 'i-trend-down',group: 'salario' },
  perdaEmprego:   { label: 'Perda de emprego',       icon: 'i-alert',     group: 'emprego' },
  reducaoGastos:  { label: 'Reduzir gastos',         icon: 'i-target',    group: 'gastos' },
};

// ── BASE: saldo mensal ATUAL, antes de qualquer simulação ──
// Reaproveita a mesma renda/mês usados no Score e na Home.
function getSimulationBaseline() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const cur = getMonthTotals(y, m);
  let salario = 0;
  try { salario = parseBRL(localStorage.getItem('sim_salario') || ''); } catch (e) {}
  const saldoBase = salario > 0 ? (salario - cur.total) : -cur.total;
  return { salario, despesaMensal: cur.total, saldoBase };
}

function simResult(o) {
  return {
    impactoMensal: o.impactoMensal,
    impactoAnual: o.impactoAnual,
    saldoPrevisto: o.saldoPrevisto,
    tempoRecuperacao: o.tempoRecuperacao,
    tempoLabel: o.tempoLabel,
    serie: o.serie || [],
    serieLabel: o.serieLabel || 'Saldo acumulado',
    tone: o.tone || 'neutral',
    resumo: o.resumo,
    detalhes: o.detalhes || [],
  };
}

// ═══════════════════════════════════════════════════════════
// 1 — COMPRA GRANDE (celular / carro): à vista ou parcelado, sem juros
// ═══════════════════════════════════════════════════════════
function calcCompraGrande(inputs, baseline) {
  const valorBem = Math.max(inputs.valorBem || 0, 0);
  const entrada  = Math.max(Math.min(inputs.entrada || 0, valorBem), 0);
  const parcelas = Math.max(Math.round(inputs.parcelas || 0), 0);
  const financiar = valorBem - entrada;
  const parcela = parcelas > 0 ? financiar / parcelas : 0;

  const serie = [];
  let acumulado = -entrada;
  for (let mes = 1; mes <= 12; mes++) {
    const pagoNoMes = (parcelas > 0 && mes <= parcelas) ? parcela : (parcelas === 0 && mes === 1 ? financiar : 0);
    acumulado += baseline.saldoBase - pagoNoMes;
    serie.push(acumulado);
  }

  let tempoRecuperacao, tempoLabel;
  if (parcelas > 0) {
    tempoRecuperacao = parcelas;
    tempoLabel = 'Tempo até quitar a compra';
  } else {
    tempoRecuperacao = baseline.saldoBase > 0 ? Math.ceil(financiar / baseline.saldoBase) : null;
    tempoLabel = 'Tempo para recompor o valor gasto à vista';
  }

  const impactoMensal = -parcela;
  return simResult({
    impactoMensal,
    impactoAnual: -parcela * Math.min(parcelas || 1, 12) * (parcelas > 0 ? 1 : 0) - (parcelas === 0 ? financiar : 0),
    saldoPrevisto: baseline.saldoBase + impactoMensal,
    tempoRecuperacao, tempoLabel,
    serie, serieLabel: 'Saldo acumulado (projeção)',
    tone: parcela > baseline.saldoBase && baseline.saldoBase > 0 ? 'warning' : 'neutral',
    resumo: parcelas > 0
      ? `Financiando ${formatBRL(financiar)} em ${parcelas}x de ${formatBRL(parcela)}, sem juros.`
      : `Compra à vista de ${formatBRL(financiar)}${entrada > 0 ? ` (após entrada de ${formatBRL(entrada)})` : ''}.`,
    detalhes: [
      `Valor do bem: ${formatBRL(valorBem)}`,
      entrada > 0 ? `Entrada: ${formatBRL(entrada)}` : null,
      `Valor financiado: ${formatBRL(financiar)}`,
    ].filter(Boolean),
  });
}

// ═══════════════════════════════════════════════════════════
// 2 — FINANCIAMENTO: amortização tipo Price (parcela fixa com juros)
// ═══════════════════════════════════════════════════════════
function calcFinanciamento(inputs, baseline) {
  const pv = Math.max(inputs.valorFinanciado || 0, 0);
  const i  = Math.max(inputs.taxaMensal || 0, 0) / 100;
  const n  = Math.max(Math.round(inputs.parcelas || 0), 1);
  const pmt = i > 0 ? (pv * i) / (1 - Math.pow(1 + i, -n)) : pv / n;
  const totalPago = pmt * n;
  const jurosTotal = totalPago - pv;

  const serie = [];
  let acumulado = 0;
  for (let mes = 1; mes <= 12; mes++) {
    acumulado += baseline.saldoBase - (mes <= n ? pmt : 0);
    serie.push(acumulado);
  }

  const impactoMensal = -pmt;
  return simResult({
    impactoMensal,
    impactoAnual: -pmt * Math.min(n, 12),
    saldoPrevisto: baseline.saldoBase + impactoMensal,
    tempoRecuperacao: n,
    tempoLabel: 'Tempo até quitar o financiamento',
    serie, serieLabel: 'Saldo acumulado (projeção)',
    tone: pmt > baseline.saldoBase && baseline.saldoBase > 0 ? 'bad' : 'neutral',
    resumo: `Parcela fixa de ${formatBRL(pmt)}/mês por ${n} meses. Total pago: ${formatBRL(totalPago)}, sendo ${formatBRL(jurosTotal)} só de juros.`,
    detalhes: [
      `Valor financiado: ${formatBRL(pv)}`,
      `Taxa: ${(i * 100).toFixed(2)}% ao mês`,
      `Total de juros: ${formatBRL(jurosTotal)}`,
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// 3 — GUARDAR DINHEIRO: juros compostos sobre aporte mensal
// ═══════════════════════════════════════════════════════════
function calcPoupanca(inputs, baseline) {
  const aporte = Math.max(inputs.valorMensal || 0, 0);
  const meses  = Math.max(Math.round(inputs.meses || 0), 1);
  const i = Math.max(inputs.rendimentoMensal || 0, 0) / 100;

  const serie = [];
  let acumulado = 0;
  for (let mes = 1; mes <= Math.max(meses, 12); mes++) {
    acumulado = i > 0 ? (acumulado + aporte) * (1 + i) : acumulado + aporte;
    if (mes <= 12) serie.push(acumulado);
  }
  const totalFinal = i > 0
    ? aporte * ((Math.pow(1 + i, meses) - 1) / i) * (1 + i)
    : aporte * meses;

  const impactoMensal = -aporte;
  return simResult({
    impactoMensal,
    impactoAnual: -aporte * Math.min(meses, 12),
    saldoPrevisto: baseline.saldoBase + impactoMensal,
    tempoRecuperacao: meses,
    tempoLabel: 'Tempo total de acumulação',
    serie, serieLabel: 'Patrimônio acumulado',
    tone: 'good',
    resumo: `Guardando ${formatBRL(aporte)}/mês por ${meses} meses${i > 0 ? ` a ${(i * 100).toFixed(2)}% a.m.` : ''}, você acumula ${formatBRL(totalFinal)}.`,
    detalhes: [
      `Aporte mensal: ${formatBRL(aporte)}`,
      i > 0 ? `Rendimento: ${(i * 100).toFixed(2)}% ao mês` : 'Sem rendimento informado',
      `Total acumulado em ${meses} meses: ${formatBRL(totalFinal)}`,
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// 4 — QUITAR DÍVIDAS: nº de parcelas para zerar a dívida
// ═══════════════════════════════════════════════════════════
function calcQuitarDividas(inputs, baseline) {
  const divida = Math.max(inputs.valorDivida || 0, 0);
  const pagamento = Math.max(inputs.pagamentoMensal || 0, 0);
  const i = Math.max(inputs.taxaMensal || 0, 0) / 100;

  let n = null, insuficiente = false;
  if (pagamento > 0) {
    if (i > 0) {
      if (pagamento <= divida * i) {
        insuficiente = true;
      } else {
        n = Math.ceil(-Math.log(1 - (i * divida) / pagamento) / Math.log(1 + i));
      }
    } else {
      n = Math.ceil(divida / pagamento);
    }
  }

  const serie = [];
  let restante = divida;
  for (let mes = 1; mes <= 12; mes++) {
    if (restante > 0) {
      restante = restante * (1 + i) - pagamento;
      if (restante < 0) restante = 0;
    }
    serie.push(restante);
  }

  const impactoMensal = -pagamento;
  const totalPago = n ? pagamento * n : null;
  return simResult({
    impactoMensal,
    impactoAnual: -pagamento * Math.min(n || 12, 12),
    saldoPrevisto: baseline.saldoBase + impactoMensal,
    tempoRecuperacao: n,
    tempoLabel: 'Tempo até quitar a dívida',
    serie, serieLabel: 'Saldo devedor restante',
    tone: insuficiente ? 'bad' : (n && n <= 12 ? 'good' : 'warning'),
    resumo: insuficiente
      ? `Um pagamento de ${formatBRL(pagamento)}/mês não cobre nem os juros da dívida — ela nunca será quitada nesse ritmo.`
      : `Pagando ${formatBRL(pagamento)}/mês, a dívida de ${formatBRL(divida)} é quitada em ${n} meses${totalPago ? ` (total pago: ${formatBRL(totalPago)})` : ''}.`,
    detalhes: [
      `Dívida total: ${formatBRL(divida)}`,
      i > 0 ? `Juros: ${(i * 100).toFixed(2)}% ao mês` : 'Sem juros informados',
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// 5/6 — MUDANÇA SALARIAL (aumento ou redução)
// ═══════════════════════════════════════════════════════════
function calcMudancaSalarial(inputs, baseline, isAumento) {
  const novoSalario = Math.max(inputs.novoSalario || 0, 0);
  const salarioAtual = baseline.salario;
  const diff = novoSalario - salarioAtual;
  const saldoPrevisto = baseline.saldoBase + diff;

  const serie = [];
  let acumulado = 0;
  for (let mes = 1; mes <= 12; mes++) { acumulado += saldoPrevisto; serie.push(acumulado); }

  let tempoRecuperacao = null, tempoLabel, resumo, tone;
  if (isAumento) {
    tempoLabel = 'Meses para acumular 1 salário extra com o aumento';
    tempoRecuperacao = diff > 0 ? Math.ceil(novoSalario / diff) : null;
    tone = 'good';
    resumo = `Seu saldo mensal passaria de ${formatBRL(baseline.saldoBase)} para ${formatBRL(saldoPrevisto)} (+${formatBRL(diff)}/mês).`;
  } else {
    const reserva = Math.max(inputs.reservaDisponivel || 0, 0);
    tone = saldoPrevisto < 0 ? (reserva > 0 ? 'warning' : 'bad') : 'neutral';
    if (saldoPrevisto < 0) {
      tempoLabel = 'Meses que sua reserva cobre o rombo mensal';
      tempoRecuperacao = reserva > 0 ? Math.floor(reserva / Math.abs(saldoPrevisto)) : 0;
      resumo = reserva > 0
        ? `Com a redução, seu saldo mensal ficaria negativo em ${formatBRL(Math.abs(saldoPrevisto))}. Sua reserva aguentaria ${tempoRecuperacao} meses nesse ritmo.`
        : `Com a redução, seu saldo mensal ficaria negativo em ${formatBRL(Math.abs(saldoPrevisto))} e você não informou reserva para cobrir esse rombo.`;
    } else {
      tempoLabel = 'Seu saldo continua positivo';
      resumo = `Mesmo com a redução, seu saldo mensal seguiria positivo: ${formatBRL(saldoPrevisto)}/mês.`;
    }
  }

  return simResult({
    impactoMensal: diff,
    impactoAnual: diff * 12,
    saldoPrevisto, tempoRecuperacao, tempoLabel,
    serie, serieLabel: 'Saldo acumulado (projeção)',
    tone, resumo,
    detalhes: [
      `Salário atual: ${formatBRL(salarioAtual)}`,
      `Novo salário: ${formatBRL(novoSalario)}`,
      `Diferença mensal: ${formatBRL(diff)}`,
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// 7 — PERDA DE EMPREGO: fôlego financeiro da reserva
// ═══════════════════════════════════════════════════════════
function calcPerdaEmprego(inputs, baseline) {
  const reserva = Math.max(inputs.reservaDisponivel || 0, 0);
  const rendaAlternativa = Math.max(inputs.rendaAlternativa || 0, 0);
  const despesa = baseline.despesaMensal;
  const deficit = despesa - rendaAlternativa;

  const serie = [];
  let restante = reserva;
  for (let mes = 1; mes <= 12; mes++) {
    if (deficit > 0) { restante -= deficit; if (restante < 0) restante = 0; }
    serie.push(restante);
  }

  let tempoRecuperacao = null, tone, resumo;
  if (deficit <= 0) {
    tone = 'good';
    resumo = 'Sua renda alternativa informada já cobriria todas as despesas — a reserva nem precisaria ser usada.';
  } else {
    tempoRecuperacao = reserva > 0 ? Math.floor(reserva / deficit) : 0;
    tone = tempoRecuperacao >= 6 ? 'good' : tempoRecuperacao >= 3 ? 'warning' : 'bad';
    resumo = reserva > 0
      ? `Com um rombo mensal de ${formatBRL(deficit)}, sua reserva de ${formatBRL(reserva)} sustentaria suas despesas por ${tempoRecuperacao} meses.`
      : `Sem reserva informada, um rombo mensal de ${formatBRL(deficit)} não teria cobertura nenhuma.`;
  }

  return simResult({
    impactoMensal: -deficit,
    impactoAnual: -deficit * 12,
    saldoPrevisto: -deficit,
    tempoRecuperacao,
    tempoLabel: 'Meses que a reserva sustenta as despesas',
    serie, serieLabel: 'Reserva restante',
    tone, resumo,
    detalhes: [
      `Despesa mensal considerada: ${formatBRL(despesa)}`,
      rendaAlternativa > 0 ? `Renda alternativa: ${formatBRL(rendaAlternativa)}` : 'Sem renda alternativa informada',
      `Reserva disponível: ${formatBRL(reserva)}`,
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// 8 — REDUÇÃO DE GASTOS
// ═══════════════════════════════════════════════════════════
function calcReducaoGastos(inputs, baseline) {
  const corte = Math.max(inputs.valorReducao || 0, 0);
  const saldoPrevisto = baseline.saldoBase + corte;
  const pctEquivalente = baseline.despesaMensal > 0 ? (corte / baseline.despesaMensal) * 100 : 0;

  const serie = [];
  let acumulado = 0;
  for (let mes = 1; mes <= 12; mes++) { acumulado += corte; serie.push(acumulado); }

  const tempoRecuperacao = corte > 0 ? Math.ceil(baseline.despesaMensal / corte) : null;
  return simResult({
    impactoMensal: corte,
    impactoAnual: corte * 12,
    saldoPrevisto,
    tempoRecuperacao,
    tempoLabel: 'Meses até formar 1 mês de despesas em reserva',
    serie, serieLabel: 'Economia acumulada',
    tone: 'good',
    resumo: `Reduzindo ${formatBRL(corte)}/mês (≈${pctEquivalente.toFixed(1)}% do seu gasto atual), seu saldo mensal passaria para ${formatBRL(saldoPrevisto)}.`,
    detalhes: [
      `Corte mensal: ${formatBRL(corte)}`,
      `Equivalente a ${pctEquivalente.toFixed(1)}% do seu gasto mensal atual`,
    ],
  });
}

// ── DESPACHO ──
function runSimulation(type, inputs) {
  const baseline = getSimulationBaseline();
  switch (type) {
    case 'celular':
    case 'carro':          return { result: calcCompraGrande(inputs, baseline), baseline };
    case 'financiamento':  return { result: calcFinanciamento(inputs, baseline), baseline };
    case 'poupanca':       return { result: calcPoupanca(inputs, baseline), baseline };
    case 'dividas':        return { result: calcQuitarDividas(inputs, baseline), baseline };
    case 'aumento':        return { result: calcMudancaSalarial(inputs, baseline, true), baseline };
    case 'reducaoSalario': return { result: calcMudancaSalarial(inputs, baseline, false), baseline };
    case 'perdaEmprego':   return { result: calcPerdaEmprego(inputs, baseline), baseline };
    case 'reducaoGastos':  return { result: calcReducaoGastos(inputs, baseline), baseline };
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════
