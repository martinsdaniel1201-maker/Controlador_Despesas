// RENDER — HISTÓRICO
// MELHORIA: exibe também o valor pago e nº de despesas
// ═══════════════════════════════════════════════
function renderHistorico() {
  const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                       'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const todayKey = getMonthKey(new Date().getFullYear(), new Date().getMonth());
  const hist = [];

  // 3 meses passados + mês atual + 3 meses futuros
  for (let i = -3; i <= 3; i++) {
    let m = currentMonth + i;
    let y = currentYear;
    while (m > 11) { m -= 12; y++; }
    while (m < 0)  { m += 12; y--; }
    const key      = getMonthKey(y, m);
    const raw      = getMonthExpenses(y, m);
    const items    = raw.map(e => getDisplayExpense(e, y, m));
    const total    = items.reduce((s, e) => s + e.valor, 0);
    const paid     = items.filter(e => e.paid).reduce((s, e) => s + e.valor, 0);
    const isFuture = key > todayKey;
    const isCurrent= key === todayKey;
    hist.push({ label: MONTH_NAMES[m] + ' / ' + y, key, total, paid, items, isFuture, isCurrent });
  }

  const maxT = Math.max(...hist.map(h => h.total), 1);

  document.getElementById('historicoContainer').innerHTML = `
    <div class="stats-card" style="padding-bottom:10px;">
      <h3 style="display:flex;align-items:center;gap:8px;"><svg class="icon" aria-hidden="true"><use href="#i-calendar"></use></svg> 7 Meses — Passado e Futuro</h3>
      ${hist.map(h => {
        const badgeText  = h.isFuture ? `${h.items.length} previstas` : h.isCurrent ? 'Mês atual' : `${h.items.length} despesas`;
        const badgeClass = h.isFuture ? 'hist-badge future' : 'hist-badge';
        const icon       = h.isFuture ? '🔮' : h.isCurrent ? '📍' : '✅';
        const subText    = h.total > 0
          ? `${icon} ${formatBRL(h.paid)} de ${formatBRL(h.total)} ${h.isFuture ? 'previsto' : 'pagos'}`
          : `${icon} Sem despesas`;

        return `
          <div style="margin-bottom:2px;">
            <div class="hist-month-row${h.isCurrent ? ' current' : ''}" onclick="toggleHistPanel('${h.key}')">
              <div class="hist-month-left">
                <span class="hist-month-label">${sanitize(h.label)}</span>
                <span class="hist-month-sub">${sanitize(subText)}</span>
              </div>
              <div class="hist-month-right">
                <span class="${badgeClass}">${sanitize(badgeText)}</span>
                <span class="hist-month-total">${h.total > 0 ? formatBRL(h.total) : '—'}</span>
                <span class="hist-chevron" id="hchev-${h.key}">›</span>
              </div>
            </div>
            <div class="hist-detail-panel" id="hpanel-${h.key}">
              ${h.items.length === 0
                ? `<div class="hist-empty">Nenhuma despesa neste mês</div>`
                : h.items.map(e => `
                    <div class="hist-detail-item">
                      <div class="hist-detail-left">
                        <span class="hist-detail-name">${sanitize(e.label)}</span>
                        <span class="hist-detail-meta">${sanitize(e.dateStr)}${e.extra ? ' · ' + sanitize(e.extra) : ''}</span>
                      </div>
                      <span class="hist-detail-amount">${formatBRL(e.valor)}</span>
                      ${h.isFuture ? '' : (e.paid
                        ? '<span class="hist-status-paid">✓ Pago</span>'
                        : '<span class="hist-status-pend">○ Pendente</span>')}
                    </div>
                  `).join('')
              }
              ${h.items.length > 0 ? `
                <div class="hist-detail-footer">
                  <span>TOTAL</span>
                  <span style="color:var(--text)">${formatBRL(h.total)}</span>
                </div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function toggleHistPanel(key) {
  const panel = document.getElementById('hpanel-' + key);
  const chev  = document.getElementById('hchev-'  + key);
  const isOpen = panel.classList.contains('open');
  // fecha todos
  document.querySelectorAll('.hist-detail-panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.hist-chevron').forEach(c => c.classList.remove('open'));
  // abre o clicado se estava fechado
  if (!isOpen) {
    panel.classList.add('open');
    chev.classList.add('open');
  }
}

// ═══════════════════════════════════════════════
