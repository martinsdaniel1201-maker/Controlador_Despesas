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

function getDisplayExpense(exp, y, m) {
  const key   = getMonthKey(y, m);
  const paid  = (exp.pagamentos || {})[key] || false;
  let label   = exp.descricao;
  let extra   = '';

  if (exp.tipo === 'fixo') {
    extra = 'Fixo';
  } else if (exp.tipo === 'parcelado') {
    const startDate = new Date(exp.dataOriginal + 'T12:00:00');
    const startKey  = getMonthKey(startDate.getFullYear(), startDate.getMonth());
    const [sy, sm]  = startKey.split('-').map(Number);
    const [ky, km]  = key.split('-').map(Number);
    const parcAtual = (ky - sy) * 12 + (km - sm) + 1;
    label = `${exp.descricao} - ${parcAtual}/${exp.totalParcelas}`;
    extra = `Parcela ${parcAtual}/${exp.totalParcelas}`;
  }

  const dateStr = exp.dataOriginal ? (() => {
    const d   = new Date(exp.dataOriginal + 'T12:00:00');
    const day = d.getDate().toString().padStart(2, '0');
    return `${day}/${String(m + 1).padStart(2, '0')}/${y}`;
  })() : '--';

  return { ...exp, label, extra, paid, dateStr, monthKey: key };
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
