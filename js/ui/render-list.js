// ALERTA DE DÍVIDAS — card destaque na tela inicial
// ═══════════════════════════════════════════════
function updateDebtAlertCard(pendingValue, countPending) {
  const card        = document.getElementById('debt-alert-card');
  const amountEl    = document.getElementById('debtAlertAmount');
  const countEl     = document.getElementById('debtAlertCount');
  if (!card || !amountEl || !countEl) return;

  if (pendingValue > 0 && countPending > 0) {
    amountEl.textContent = formatBRL(pendingValue);
    countEl.textContent  = countPending;
    card.classList.add('visible');
  } else {
    card.classList.remove('visible');
  }
}

// ═══════════════════════════════════════════════
// RENDER — LISTA PRINCIPAL
// ═══════════════════════════════════════════════
function updateMonthLabel() {
  const months = ['janeiro','fevereiro','março','abril','maio','junho',
                  'julho','agosto','setembro','outubro','novembro','dezembro'];
  document.getElementById('monthLabel').textContent = `${months[currentMonth]} / ${currentYear}`;
}

function triggerListAnimation() {
  const c = document.getElementById('expenseList');
  if (c) { c.classList.remove('fade-in-up'); void c.offsetWidth; c.classList.add('fade-in-up'); }
}

function renderList() {
  const list   = document.getElementById('expenseList');
  const search = document.getElementById('searchInput').value.toLowerCase();
  const raw    = getMonthExpenses(currentYear, currentMonth);
  const disp   = raw.map(e => getDisplayExpense(e, currentYear, currentMonth));

  const filtered = disp.filter(e => {
    if (search && !e.label.toLowerCase().includes(search)) return false;
    if (activeFilter === 'pago')      return e.paid;
    if (activeFilter === 'pendente')  return !e.paid;
    if (activeFilter === 'fixo')      return e.tipo === 'fixo';
    if (activeFilter === 'parcelado') return e.tipo === 'parcelado';
    return true;
  });

  // Ordena pela data de vencimento no mês atual (dateStr: dd/mm/yyyy)
  filtered.sort((a, b) => {
    const toISO = s => { const p = s.split("/"); return `${p[2]}-${p[1]}-${p[0]}`; };
    return toISO(a.dateStr).localeCompare(toISO(b.dateStr));
  });

  const total   = disp.reduce((s, e) => s + e.valor, 0);
  const paid    = disp.filter(e => e.paid).reduce((s, e) => s + e.valor, 0);
  const pending = total - paid;
  const pct     = total > 0 ? Math.round((paid / total) * 100) : 0;
  const countPending = disp.filter(e => !e.paid).length;

  // Atualiza hidden elements (compatibilidade)
  const sumTotal = document.getElementById('sumTotal');
  const sumPaid  = document.getElementById('sumPaid');
  const sumPend  = document.getElementById('sumPending');
  if (sumTotal) sumTotal.textContent = formatBRL(total);
  if (sumPaid)  sumPaid.textContent  = formatBRL(paid);
  if (sumPend)  sumPend.textContent  = formatBRL(pending);

  // Atualiza CARD COMPACTO (#10)
  document.getElementById('rscPct').textContent      = pct + '%';
  document.getElementById('rscFill').style.width     = pct + '%';
  document.getElementById('rscFill').className       = 'rsc-bar-fill' + (pct >= 80 ? ' danger' : pct >= 50 ? ' warn' : '');
  document.getElementById('rscTotal').textContent    = formatBRL(total);
  document.getElementById('rscPaid').textContent     = formatBRL(paid);
  document.getElementById('rscCount').textContent    = countPending + (countPending === 1 ? ' pend.' : ' pend.');
  document.getElementById('rscMotivation').textContent = getMotivation(pct, pending, disp.length);
  const chip = document.getElementById('rscPendingChip');
  chip.textContent = pending > 0 ? formatBRL(pending) + ' a pagar' : '✓ Tudo pago';
  chip.className   = 'rsc-pending-chip' + (pending === 0 ? ' clear' : '');

  document.getElementById('footTotal').textContent   = formatBRL(total);
  document.getElementById('footPending').textContent = formatBRL(pending);

  // Atualiza campo "Despesas do Mês" na calculadora com o TOTAL (não só pendente)
  const simDespEl = document.getElementById('simDespesas');
  if (simDespEl) simDespEl.value = formatBRL(total);

  // BADGE ALERTA (#9): verifica contas vencidas ou vencendo hoje
  const today = new Date(); today.setHours(0,0,0,0);
  const hasUrgent = disp.some(e => {
    if (e.paid) return false;
    const parts = e.dateStr.split('/');
    if (parts.length < 3) return false;
    const due = new Date(parts[2], parts[1]-1, parts[0]);
    return due <= today;
  });
  const dot = document.getElementById('tabAlertDot');
  if (dot) dot.classList.toggle('visible', hasUrgent);

  // ALERTA DE DÍVIDAS: atualiza card principal
  updateDebtAlertCard(pending, countPending);

  const subtotalContainer = document.getElementById('subtotalContainer');
  if (activeFilter !== 'all') {
    const sub = filtered.reduce((s, e) => s + e.valor, 0);
    const filterLabels = { pendente: 'A Pagar', pago: 'Pagas', fixo: 'Fixas', parcelado: 'Parceladas' };
    document.getElementById('subtotalLabel').textContent  = `Total (${filterLabels[activeFilter]}):`;
    document.getElementById('subtotalValue').textContent  = formatBRL(sub);
    subtotalContainer.style.display = 'flex';
  } else {
    subtotalContainer.style.display = 'none';
  }

  if (filtered.length === 0) {
    const isFiltering = search || activeFilter !== 'all';
    if (isFiltering) {
      list.innerHTML = `<div class="empty-state">
        <div class="emoji"><svg class="icon icon-xl"><use href="#i-search"></use></svg></div>
        <h3>Nada encontrado</h3>
        <p>Nenhuma despesa combina com sua busca ou filtro atual.<br>Tente limpar a busca ou trocar o filtro.</p>
      </div>`;
    } else {
      list.innerHTML = `<div class="empty-state">
        <div class="emoji"><svg class="icon icon-xl"><use href="#i-party"></use></svg></div>
        <h3>Nenhuma despesa este mês</h3>
        <p>Toque no <strong>+</strong> para adicionar sua primeira despesa do mês!</p>
      </div>`;
    }
    return;
  }

  const groups = {};
  filtered.forEach(e => {
    // Agrupa pela data de vencimento no mês atual (dateStr: dd/mm/yyyy)
    // Ex: despesa fixa cadastrada em 05/09 → vencimento no mês exibido é sempre dia 05
    const groupKey = e.dateStr;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(e);
  });

  const dayNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  list.innerHTML = Object.entries(groups).map(([dateKey, items]) => {
    // dateKey está no formato dd/mm/yyyy
    const parts = dateKey.split('/');
    const d = new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
    const headerLabel = `${parts[0]}/${parts[1]} — ${dayNames[d.getDay()]}`;
    return `
      <div class="date-group-header">${sanitize(headerLabel)}</div>
      ${items.map(e => renderItem(e)).join('')}
    `;
  }).join('');
}

// FIX: dados do usuário sanitizados antes de inserir no innerHTML
function renderItem(e) {
  const cat       = CATEGORIES.find(c => c.id === (e.categoria || 'outros')) || CATEGORIES[9];
  const color     = CAT_COLORS[cat.id] || '#888';
  const paidClass = e.paid ? ' paid' : '';
  const safeName   = sanitize(e.label);
  const safeDate   = sanitize(e.dateStr);
  const safeExtra  = e.extra ? ' · ' + sanitize(e.extra) : '';
  const safeAmount = sanitize(formatBRL(e.valor));
  const safeId     = sanitize(e.id);
  const safeKey    = sanitize(e.monthKey);
  const dueBadge   = getDueBadge(e.dateStr, e.paid);
  const noteHtml   = e.nota ? `<div class="expense-note">💬 ${sanitize(e.nota)}</div>` : '';

  return `
    <div class="swipe-wrapper">
      <div class="expense-item${paidClass}"
           onclick="togglePay('${safeId}','${safeKey}')"
           oncontextmenu="openInlineEdit(event,'${safeId}')"
           role="button" tabindex="0"
           aria-label="${safeName} — ${safeAmount}${e.paid ? ' (pago)' : ' (pendente)'}">
        <div class="left">
          <div class="expense-icon" style="background:${color}15;color:${color}" aria-hidden="true">
            <span>${cat.emoji}</span>
          </div>
          <div class="expense-info">
            <div class="expense-name">${safeName}${dueBadge}</div>
            <div class="expense-meta">${safeDate}${safeExtra}</div>
            ${noteHtml}
          </div>
        </div>
        <div class="expense-right">
          <div class="expense-amount" ondblclick="openInlineEdit(event,'${safeId}')" style="cursor:pointer" title="Duplo toque para editar valor">${safeAmount}</div>
          ${e.paid ? '<div class="paid-tag" aria-label="Pago"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-check"></use></svg> PAGO</div>' : ''}
        </div>
      </div>
      <div class="item-actions-bar">
        <button class="action-bar-btn pay-btn"
                onclick="togglePay('${safeId}','${safeKey}')"
                aria-label="${e.paid ? 'Marcar como pendente' : 'Marcar como pago'}">
          <span aria-hidden="true"><svg class="icon icon-sm"><use href="#i-${e.paid ? 'undo' : 'check'}"></use></svg></span>${e.paid ? 'Pendente' : 'Pagar'}
        </button>
        <button class="action-bar-btn edit-btn"
                onclick="event.stopPropagation();editExpense('${safeId}')"
                aria-label="Editar despesa ${safeName}">
          <span aria-hidden="true"><svg class="icon icon-sm"><use href="#i-edit"></use></svg></span>Editar
        </button>
        <button class="action-bar-btn dup-btn"
                onclick="event.stopPropagation();duplicateExpense('${safeId}')"
                aria-label="Duplicar despesa ${safeName}">
          <span aria-hidden="true"><svg class="icon icon-sm"><use href="#i-copy"></use></svg></span>Duplicar
        </button>
        <button class="action-bar-btn del-btn"
                onclick="event.stopPropagation();deleteExpense('${safeId}')"
                aria-label="Excluir despesa ${safeName}">
          <span aria-hidden="true"><svg class="icon icon-sm"><use href="#i-trash"></use></svg></span>Excluir
        </button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════
