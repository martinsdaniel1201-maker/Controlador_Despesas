// LIMPEZA
// ═══════════════════════════════════════════════
async function clearMonth() {
  const confirmar = await mostrarPopup({
    emoji:  '🗑️',
    titulo: 'Limpar mês atual?',
    texto:  'Isso removerá apenas as despesas únicas deste mês. Continuar?',
    botoes: [
      { texto: 'Sim, Limpar Mês', classe: 'confirm-btn-danger',    valor: true  },
      { texto: 'Cancelar',        classe: 'confirm-btn-secondary', valor: false }
    ]
  });
  if (!confirmar) return;
  const key = getMonthKey(currentYear, currentMonth);
  expenses  = expenses.filter(e => !(e.tipo === 'unico' && e.monthKey === key));
  save(); renderAll();
  showToast('🗑 Mês limpo!');
}

async function clearAll() {
  const confirmar = await mostrarPopup({
    emoji:  '⚠️',
    titulo: 'Excluir TUDO permanentemente?',
    texto:  'Esta ação é irreversível. Todas as despesas, parcelamentos e históricos serão apagados.',
    botoes: [
      { texto: 'Apagar Tudo', classe: 'confirm-btn-danger',    valor: true  },
      { texto: 'Cancelar',    classe: 'confirm-btn-secondary', valor: false }
    ]
  });
  if (!confirmar) return;
  expenses = [];
  save(); renderAll();
  showToast('🗑 Tudo excluído!');
}

// ═══════════════════════════════════════════════
