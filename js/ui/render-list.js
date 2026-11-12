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

let _listAnimTimer;
function triggerListAnimation(dir) {
  const c = document.getElementById('expenseList');
  if (!c) return;
  const cls = ['fade-in-up', 'content-slide-in-l', 'content-slide-in-r', 'items-animate'];
  c.classList.remove(...cls);
  void c.offsetWidth;
  c.classList.add('items-animate');
  if (dir === 1 || dir === -1) {
    c.classList.add(dir > 0 ? 'content-slide-in-l' : 'content-slide-in-r');
  } else {
    c.classList.add('fade-in-up');
  }
  // Remove tudo ao terminar: classe de animação "presa" reinicia quando a
  // aba volta de display:none e causa a piscada.
  clearTimeout(_listAnimTimer);
  _listAnimTimer = setTimeout(() => c.classList.remove(...cls), 800);
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
  document.getElementById('rscMotivation').textContent = getMotivation(pct, countPending, disp.length);
  const chip = document.getElementById('rscPendingChip');
  chip.textContent = pending > 0 ? formatBRL(pending) + ' a pagar' : '✓ Tudo pago';
  chip.className   = 'rsc-pending-chip' + (pending === 0 ? ' clear' : '');

  // Quando há contas divididas, mostra a conta cheia ao lado da sua parte
  const totalCheio = disp.reduce((s, e) => s + (e.dividido ? e.valorBruto : e.valor), 0);
  const subEl = document.getElementById('rscSub');
  if (subEl) {
    if (disp.some(e => e.dividido) && Math.abs(totalCheio - total) > 0.004) {
      subEl.textContent = `Contas cheias ${formatBRL(totalCheio)} · sua parte ${formatBRL(total)}`;
      subEl.style.display = 'block';
    } else {
      subEl.style.display = 'none';
    }
  }
  renderAcertoCard(disp);

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
  const paidClass = (e.paid && !e.soInfo) ? ' paid' : '';
  const safeName   = sanitize(e.label);
  const safeDate   = sanitize(e.dateStr);
  const safeExtra  = e.extra ? ' · ' + sanitize(e.extra) : '';
  const safeAmount = sanitize(formatBRL(e.soInfo ? e.valorBruto : e.valor));  // valor = minha parte (informativo: mostra o valor cheio, sem somar)
  const safeId     = sanitize(e.id);
  const safeKey    = sanitize(e.monthKey);
  const dueBadge   = getDueBadge(e.dateStr, e.paid);
  const noteHtml   = e.nota ? `<div class="expense-note">💬 ${sanitize(e.nota)}</div>` : '';
  // Conta cheia x minha parte (divisão) e total da compra (parcelado)
  const chips = [];
  if (e.dividido) {
    const outro = round2(e.valorBruto - e.valor);
    const nomeOutro = souDonoDaDespesa(e) ? (e.rateio.com || 'outro') : getNomeDoMembro(e.user_id);
    chips.push(`<span class="conta-chip neutro">Conta ${sanitize(formatBRL(e.valorBruto))}</span>`);
    chips.push(`<span class="conta-chip eu">Você ${sanitize(formatBRL(e.valor))}</span>`);
    chips.push(`<span class="conta-chip">${sanitize(nomeOutro)} ${sanitize(formatBRL(outro))}</span>`);
  }
  let parcelaHtml = '';
  if (e.parcela) {
    const p = e.parcela;
    const totalShow  = e.dividido ? p.valorTotalContaMinha : p.valorTotalConta;
    const restaShow  = e.dividido ? p.valorRestanteMinha   : p.valorRestante;
    const pctPago    = p.total > 0 ? Math.round((p.atual / p.total) * 100) : 0;
    chips.push(`<span class="conta-chip neutro">Compra ${sanitize(formatBRL(totalShow))}${e.dividido ? ' (sua parte)' : ''}</span>`);
    chips.push(p.restantes > 0
      ? `<span class="conta-chip neutro">Faltam ${p.restantes}x · ${sanitize(formatBRL(restaShow))}</span>`
      : `<span class="conta-chip eu">Última parcela</span>`);
    parcelaHtml = `<div class="parcela-bar" aria-hidden="true"><span style="width:${pctPago}%"></span></div>`;
  }
  if (e.informativo) {
    chips.push(e.soInfo
      ? '<span class="conta-chip neutro">Só informativo · não entra nos seus totais</span>'
      : '<span class="conta-chip neutro">O grupo vê, mas não conta nos totais deles</span>');
  }
  const rateioHtml = chips.length ? `<div class="expense-conta">${chips.join('')}</div>${parcelaHtml}` : '';
  const souDono = !e.user_id || e.user_id === currentUser?.id;
  const podeEditar = !e.soInfo && (souDono || (e.grupoId && window.meuGrupo?.id === e.grupoId && window.meuGrupo?.permite_membros_editar));
  const podeExcluir = souDono;
  const grupoTagHtml = e.grupoId ? `<span class="grupo-badge">GRUPO</span>` : '';
  const brandLogo  = getBrandLogoUrl(e.label);
  const iconInnerHtml = brandLogo
    ? `<img src="${brandLogo}" alt="" class="expense-brand-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
       <span class="expense-icon-fallback" style="display:none">${cat.emoji}</span>`
    : `<span>${cat.emoji}</span>`;

  const enterClass = (window._novaDespesaId && window._novaDespesaId === e.id) ? ' item-enter' : '';
  return `
    <div class="swipe-wrapper${enterClass}" data-expid="${safeId}">
      <div class="swipe-bg" aria-hidden="true">
        <span class="swipe-bg-action pay"><svg class="icon icon-sm"><use href="#i-${e.paid ? 'undo' : 'check'}"></use></svg> ${e.paid ? 'Pendente' : 'Pagar'}</span>
        <span class="swipe-bg-action delete">Excluir <svg class="icon icon-sm"><use href="#i-trash"></use></svg></span>
      </div>
      <div class="expense-item${paidClass}${!podeEditar ? ' readonly-grupo' : ''}"
           onclick="${podeEditar ? `togglePay('${safeId}','${safeKey}')` : ''}"
           oncontextmenu="${podeEditar ? `openInlineEdit(event,'${safeId}')` : 'event.preventDefault()'}"
           data-can-delete="${podeExcluir}"
           role="button" tabindex="0"
           aria-label="${safeName} — ${safeAmount}${e.paid ? ' (pago)' : ' (pendente)'}${!podeEditar ? ' (despesa do grupo, somente leitura)' : ''}">
        <div class="left">
          <div class="expense-icon" style="background:${color}15;color:${color}" aria-hidden="true">
            ${iconInnerHtml}
          </div>
          <div class="expense-info">
            <div class="expense-name">${safeName}${grupoTagHtml}${dueBadge}</div>
            <div class="expense-meta">${safeDate}${safeExtra}</div>
            ${noteHtml}
            ${rateioHtml}
          </div>
        </div>
        <div class="expense-right">
          <div class="expense-amount${e.soInfo ? ' info' : ''}" ${podeEditar ? `ondblclick="openInlineEdit(event,'${safeId}')" style="cursor:pointer" title="Duplo toque para editar valor"` : ''}>${safeAmount}</div>
          ${e.soInfo ? '<div class="expense-amount-sub">informativo</div>' : (e.dividido ? '<div class="expense-amount-sub">sua parte</div>' : (e.parcela ? '<div class="expense-amount-sub">parcela</div>' : ''))}
          ${e.paid && !e.soInfo ? '<div class="paid-tag" aria-label="Pago"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-check"></use></svg> PAGO</div>' : ''}
        </div>
        ${podeEditar ? `
        <button class="item-menu-btn"
                onclick="event.stopPropagation();toggleItemMenu(event,'${safeId}')"
                aria-label="Mais ações para ${safeName}" aria-haspopup="true">
          <svg class="icon icon-sm"><use href="#i-more"></use></svg>
        </button>` : ''}
      </div>
      ${podeEditar ? `
      <div class="item-menu" id="menu-${safeId}" role="menu">
        <button class="item-menu-option" role="menuitem"
                onclick="event.stopPropagation();closeItemMenus();togglePay('${safeId}','${safeKey}')">
          <svg class="icon icon-sm"><use href="#i-${e.paid ? 'undo' : 'check'}"></use></svg>${e.paid ? 'Marcar como pendente' : 'Marcar como pago'}
        </button>
        <button class="item-menu-option" role="menuitem"
                onclick="event.stopPropagation();closeItemMenus();editExpense('${safeId}')">
          <svg class="icon icon-sm"><use href="#i-edit"></use></svg>Editar
        </button>
        <button class="item-menu-option" role="menuitem"
                onclick="event.stopPropagation();closeItemMenus();duplicateExpense('${safeId}')">
          <svg class="icon icon-sm"><use href="#i-copy"></use></svg>Duplicar
        </button>
        ${podeExcluir ? `
        <button class="item-menu-option danger" role="menuitem"
                onclick="event.stopPropagation();closeItemMenus();deleteExpense('${safeId}')">
          <svg class="icon icon-sm"><use href="#i-trash"></use></svg>Excluir
        </button>` : ''}
      </div>` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════


// ═══════════════════════════════════════════════
// ACERTO DO MÊS — quem deve quanto a quem nas contas divididas
// (informativo: considera só a divisão, não controla quem já acertou)
// ═══════════════════════════════════════════════
function calcularAcertos(disp) {
  const saldo = {}; // nome -> positivo: essa pessoa me deve | negativo: eu devo
  disp.forEach(e => {
    if (!e.dividido) return;
    const dono   = souDonoDaDespesa(e);
    const nome   = dono ? (e.rateio.com || 'Outra pessoa') : getNomeDoMembro(e.user_id);
    const euPaguei = dono ? e.rateio.pagoPorMim !== false : e.rateio.pagoPorMim === false;
    saldo[nome] = round2((saldo[nome] || 0) + (euPaguei ? round2(e.valorBruto - e.valor) : -e.valor));
  });
  return Object.entries(saldo).filter(([, v]) => Math.abs(v) >= 0.01);
}

function buildAcertoRowsHtml(acertos) {
  return acertos.map(([nome, v]) => v > 0
    ? `<div class="acerto-row"><span>${sanitize(nome)} te deve</span><span class="val recebe">${sanitize(formatBRL(v))}</span></div>`
    : `<div class="acerto-row"><span>Você deve a ${sanitize(nome)}</span><span class="val paga">${sanitize(formatBRL(-v))}</span></div>`
  ).join('');
}

function renderAcertoCard(disp) {
  const card = document.getElementById('acertoCard');
  if (!card) return;
  const acertos = calcularAcertos(disp);
  if (!acertos.length) { card.style.display = 'none'; card.innerHTML = ''; return; }
  card.innerHTML = `<div class="acerto-title">Acerto do mês</div>${buildAcertoRowsHtml(acertos)}`;
  card.style.display = 'block';
}
