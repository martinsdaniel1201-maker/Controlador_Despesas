// EXPORTAÇÃO / IMPORTAÇÃO
// ═══════════════════════════════════════════════
function exportCSV() {
  const raw  = getMonthExpenses(currentYear, currentMonth);
  const rows = [['Descrição','Valor','Data','Tipo','Categoria','Pago']];
  raw.forEach(e => {
    const d = getDisplayExpense(e, currentYear, currentMonth);
    rows.push([d.label, d.valor.toFixed(2), d.dateStr, e.tipo, e.categoria || 'outros', d.paid ? 'Sim' : 'Não']);
  });
  // FIX: aspas duplas dentro de campos escapadas corretamente; BOM para Excel brasileiro
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `despesas-${getMonthKey(currentYear, currentMonth)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('📥 CSV exportado!');
}

// ═══════════════════════════════════════════════
// EXPORTAÇÃO CSV POR PERÍODO CUSTOMIZADO
// ═══════════════════════════════════════════════
function openExportRangeForm() {
  const key = getMonthKey(currentYear, currentMonth);
  document.getElementById('exportRangeStart').value = key;
  document.getElementById('exportRangeEnd').value   = key;
  document.getElementById('exportRangeOverlay').classList.add('open');
}
function closeExportRangeForm() {
  document.getElementById('exportRangeOverlay').classList.remove('open');
}

function confirmExportRange() {
  const startVal = document.getElementById('exportRangeStart').value; // yyyy-mm
  const endVal   = document.getElementById('exportRangeEnd').value;
  if (!startVal || !endVal) { showToast('Selecione o período'); return; }

  const [sy, sm] = startVal.split('-').map(Number);
  const [ey, em] = endVal.split('-').map(Number);
  let start = sy * 12 + (sm - 1);
  let end   = ey * 12 + (em - 1);
  if (start > end) { [start, end] = [end, start]; }

  const rows = [['Mês','Descrição','Valor','Data','Tipo','Categoria','Pago']];
  for (let k = start; k <= end; k++) {
    const y = Math.floor(k / 12);
    const m = k % 12;
    const raw = getMonthExpenses(y, m);
    raw.forEach(e => {
      const d = getDisplayExpense(e, y, m);
      const catObj = CATEGORIES.find(c => c.id === (e.categoria || 'outros'));
      rows.push([getMonthKey(y, m), d.label, d.valor.toFixed(2), d.dateStr, e.tipo, catObj ? catObj.label : 'Outros', d.paid ? 'Sim' : 'Não']);
    });
  }

  if (rows.length === 1) { showToast('Nenhuma despesa encontrada no período'); return; }

  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `despesas-${startVal}_a_${endVal}.csv`;
  a.click(); URL.revokeObjectURL(url);
  closeExportRangeForm();
  showToast('📥 CSV do período exportado!');
}

// NOVO: exportar JSON completo para backup
function exportJSON() {
  try {
    const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `backup-despesas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('📦 Backup JSON exportado!');
  } catch (e) {
    showToast('❌ Erro ao exportar JSON');
  }
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file   = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          expenses = data;
          save(); renderAll();
          showToast('📤 Dados importados com sucesso!');
        } else {
          showToast('❌ Formato de arquivo inválido');
        }
      } catch { showToast('❌ Arquivo inválido ou corrompido'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ═══════════════════════════════════════════════
