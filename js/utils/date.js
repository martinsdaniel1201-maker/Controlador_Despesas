// HELPERS DE DATA
// ═══════════════════════════════════════════════
function getMonthKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function getMonthExpenses(y, m) {
  const key = getMonthKey(y, m);
  return expenses.filter(e => {
    if (e.ignorarMeses && e.ignorarMeses.includes(key)) return false;
    if (e.tipo === 'unico') return e.monthKey === key;
    if (e.tipo === 'fixo') {
      const startDate = new Date(e.dataOriginal + 'T12:00:00');
      const startKey  = getMonthKey(startDate.getFullYear(), startDate.getMonth());
      return key >= startKey;
    }
    if (e.tipo === 'parcelado') {
      const startDate = new Date(e.dataOriginal + 'T12:00:00');
      const startKey  = getMonthKey(startDate.getFullYear(), startDate.getMonth());
      if (key < startKey) return false;
      const [sy, sm] = startKey.split('-').map(Number);
      const [ky, km] = key.split('-').map(Number);
      return (ky - sy) * 12 + (km - sm) < e.totalParcelas;
    }
    return false;
  });
}

// ═══════════════════════════════════════════════
// DIVISÃO DE CONTAS (RATEIO) E EXCEÇÕES POR MÊS
// ═══════════════════════════════════════════════
// Regras:
//  - exp.valor é SEMPRE o valor cheio da conta (ou da parcela).
//  - exp.rateio.percentual é a parte de QUEM LANÇOU a conta.
//  - Quem lançou paga `percentual`%; os demais membros do grupo dividem o resto.
//  - Todos os totais do app usam a "minha parte" (getDisplayExpense().valor);
//    o valor cheio fica em getDisplayExpense().valorBruto.
//  - exp.overrides[monthKey] guarda exceções de UM mês (valor, descrição, dia...)
//    sem criar outra despesa.
// Forma canônica do rateio, para comparar sem depender da ordem das chaves (o jsonb do banco reordena)
function canonRateio(r) {
  return r ? JSON.stringify({ com: r.com || '', percentual: Number(r.percentual) || 0,
                              pagoPorMim: r.pagoPorMim !== false, informativo: !!r.informativo }) : 'null';
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

function souDonoDaDespesa(exp) {
  return !exp.user_id || exp.user_id === (typeof currentUser !== 'undefined' ? currentUser?.id : null);
}

// % da conta que cabe a quem está olhando agora
function getMinhaPercentual(exp, rateio) {
  const r = rateio === undefined ? exp.rateio : rateio;
  if (!r) return 100;
  const pct = Math.min(100, Math.max(1, Number(r.percentual) || 50));
  if (souDonoDaDespesa(exp)) return pct;
  // Membro do grupo olhando a despesa de outro: fica com o restante,
  // repartido igualmente entre os demais membros (grupo de 2 = 100 - pct).
  const qtd = Object.keys(window.meuGrupoMembrosMap || {}).length;
  const outros = Math.max(1, qtd - 1);
  return (100 - pct) / outros;
}

function minhaParte(valor, exp, rateio) {
  return round2(valor * getMinhaPercentual(exp, rateio) / 100);
}

function getOverride(exp, key) {
  return (exp.overrides && exp.overrides[key]) || null;
}

function getDisplayExpense(exp, y, m) {
  const key   = getMonthKey(y, m);
  const paid  = (exp.pagamentos || {})[key] || false;
  const ov    = getOverride(exp, key) || {};

  const descricao = ov.descricao !== undefined ? ov.descricao : exp.descricao;
  const valorBruto = ov.valor !== undefined ? Number(ov.valor) : exp.valor;
  const categoria = ov.categoria !== undefined ? ov.categoria : exp.categoria;
  const nota      = ov.nota !== undefined ? ov.nota : exp.nota;
  const rateio    = ov.rateio !== undefined ? ov.rateio : exp.rateio;

  let label = descricao;
  let extra = '';
  let parcela = null;

  if (exp.tipo === 'fixo') {
    extra = 'Fixo';
  } else if (exp.tipo === 'parcelado') {
    const startDate = new Date(exp.dataOriginal + 'T12:00:00');
    const startKey  = getMonthKey(startDate.getFullYear(), startDate.getMonth());
    const [sy, sm]  = startKey.split('-').map(Number);
    const [ky, km]  = key.split('-').map(Number);
    const parcAtual = (ky - sy) * 12 + (km - sm) + 1;
    const n         = exp.totalParcelas || 0;
    label = `${descricao} - ${parcAtual}/${n}`;
    extra = `Parcela ${parcAtual}/${n}`;
    const valorTotalConta = exp.valorTotal != null ? Number(exp.valorTotal) : round2(exp.valor * n);
    const restantes = Math.max(0, n - parcAtual);
    parcela = {
      atual: parcAtual,
      total: n,
      restantes,
      valorTotalConta,                                   // valor cheio da compra
      valorRestante: round2(restantes * exp.valor),      // o que ainda falta pagar depois desta parcela
    };
  }

  const pctMinha = getMinhaPercentual(exp, rateio);
  const valorMeu = rateio ? round2(valorBruto * pctMinha / 100) : valorBruto;
  // "Só avisar o grupo": quem lançou paga tudo; para os outros membros a despesa é
  // apenas informativa (não entra nos totais deles nem vira pendência/lembrete).
  const informativo = !!(rateio && rateio.informativo);
  const soInfo = informativo && !souDonoDaDespesa(exp);

  if (parcela && rateio) {
    parcela.valorTotalContaMinha = round2(parcela.valorTotalConta * pctMinha / 100);
    parcela.valorRestanteMinha   = round2(parcela.valorRestante   * pctMinha / 100);
  }

  const dia = ov.dia ? String(ov.dia).padStart(2, '0') : null;
  const dateStr = exp.dataOriginal ? (() => {
    const d   = new Date(exp.dataOriginal + 'T12:00:00');
    const day = dia || d.getDate().toString().padStart(2, '0');
    return `${day}/${String(m + 1).padStart(2, '0')}/${y}`;
  })() : '--';

  return {
    ...exp,
    descricao, categoria, nota, rateio,
    valorBruto,                 // conta cheia (ou parcela cheia)
    valor: valorMeu,            // MINHA parte — é esta que entra nos totais
    dividido: !!rateio && !informativo,
    informativo, soInfo,
    pctMinha,
    parcela,
    temExcecao: !!getOverride(exp, key),
    label, extra, paid: soInfo ? true : paid, dateStr, monthKey: key
  };
}

// ═══════════════════════════════════════════════
// HELPERS: VENCIMENTO (#3)
// ═══════════════════════════════════════════════
function getDueBadge(dateStr, paid) {
  if (paid) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const parts = dateStr.split('/'); // dd/mm/yyyy
  if (parts.length < 3) return '';
  const due = new Date(parts[2], parts[1]-1, parts[0]);
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0)  return `<span class="due-badge overdue">Vencida ${Math.abs(diff)}d</span>`;
  if (diff === 0) return `<span class="due-badge today">Vence hoje!</span>`;
  if (diff <= 3)  return `<span class="due-badge soon">Vence em ${diff}d</span>`;
  return '';
}

// ═══════════════════════════════════════════════
