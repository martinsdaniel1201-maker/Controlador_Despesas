// ═══════════════════════════════════════════════
// LANÇAMENTO RÁPIDO POR TEXTO
// ═══════════════════════════════════════════════
// "mercado 85 ontem" · "uber 18,50" · "tv 1200 10x" · "luz 180 dia 15 fixo"
// "jantar 120 dividido com Maria" · "padaria 12 pago"
// Entende valor, data, parcelas, fixo, divisão e se já foi pago.
// A categoria vem do histórico (mesma descrição) ou das palavras-chave.
// Funciona com o ditado do teclado do celular (microfone do iPhone/Android).

function _qaParseMoney(str) {
  if (/,/.test(str)) return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) return parseFloat(str.replace(/\./g, ''));
  return parseFloat(str);
}

function _qaIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _qaOutroMembro() {
  const map = window.meuGrupoMembrosMap || {};
  const outros = Object.entries(map).filter(([id]) => id !== currentUser?.id);
  return outros.length === 1 ? { id: outros[0][0], nome: outros[0][1] } : null;
}

function parseQuickAdd(raw) {
  let t = ' ' + (raw || '').trim() + ' ';
  if (t.trim().length < 2) return null;
  const take = (re) => { const m = t.match(re); if (m) t = t.replace(re, ' '); return m; };
  const avisos = [];

  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const data = new Date(hoje);

  const pago = !!take(/\b(?:j[aá]\s+)?pag(?:o|uei|a)\b/i);
  const fixo = !!take(/\b(?:fixo|fixa|todo\s+m[eê]s|mensal)\b/i);

  // ── data ──
  let m;
  if (take(/\banteontem\b/i))      data.setDate(data.getDate() - 2);
  else if (take(/\bontem\b/i))     data.setDate(data.getDate() - 1);
  else if (take(/\bamanh[aã]\b/i)) data.setDate(data.getDate() + 1);
  else take(/\bhoje\b/i);
  if ((m = take(/\bdia\s+(\d{1,2})\b/i))) {
    const d = parseInt(m[1], 10);
    if (d >= 1 && d <= 31) data.setDate(Math.min(d, new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate()));
  } else if ((m = take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const d = parseInt(m[1], 10), mo = parseInt(m[2], 10);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      let y = m[3] ? parseInt(m[3], 10) : data.getFullYear();
      if (y < 100) y += 2000;
      data.setFullYear(y, mo - 1, d);
    }
  }

  // ── divisão ──
  let dividir = false, comNome = null;
  if ((m = take(/\b(?:dividid[oa]|dividi|dividir|rachad[oa]|rachei|racha|metade)(?:\s+(?:com|c\/)\s+([A-Za-zÀ-ÿ]+))?/i))) {
    dividir = true; comNome = m[1] || null;
  }

  // ── parcelas ──
  let nParc = null, parcelaDireta = false;
  if ((m = take(/\b(\d{1,2})\s*x\s*(?:de|d[eo])\b/i))) { nParc = parseInt(m[1], 10); parcelaDireta = true; }
  else if ((m = take(/\b(?:em\s+)?(\d{1,2})\s*x\b/i)))  { nParc = parseInt(m[1], 10); }
  if (nParc !== null && (nParc < 2 || nParc > 60)) nParc = null;

  // ── valor: prefere o número com R$/reais/centavos; senão, o último ──
  const re = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real|conto|contos|pila|pilas))?/gi;
  const achados = [...t.matchAll(re)].filter(x => x[1]);
  if (!achados.length) return null;
  const forte = achados.filter(x => /r\$|reais|real|conto|pila/i.test(x[0]) || /[.,]\d{1,2}$/.test(x[1]));
  const escolhido = forte.length ? forte[forte.length - 1] : achados[achados.length - 1];
  const valorDigitado = _qaParseMoney(escolhido[1]);
  if (!valorDigitado || valorDigitado <= 0) return null;
  t = t.slice(0, escolhido.index) + ' ' + t.slice(escolhido.index + escolhido[0].length);

  // ── descrição ──
  let desc = t.replace(/r\$/gi, ' ').replace(/[,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  desc = desc.replace(/^(?:de|do|da|no|na|em|com|pra|para)\s+/i, '').replace(/\s+(?:de|do|da|no|na|em|com|pra|para)$/i, '').trim();
  if (!desc) desc = 'Despesa';
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);

  // ── tipo e valores ──
  let tipo = 'unico', valor = valorDigitado, valorTotal = null, totalParcelas = null;
  if (nParc) {
    tipo = 'parcelado'; totalParcelas = nParc;
    if (parcelaDireta) { valor = valorDigitado; valorTotal = round2(valorDigitado * nParc); }
    else               { valorTotal = valorDigitado; valor = round2(valorDigitado / nParc); }
  } else if (fixo) {
    tipo = 'fixo';
  }

  // ── categoria: histórico (mesma descrição) > palavras-chave > outros ──
  const descNorm = normalizeForMatch(desc).trim();
  let anterior = null;
  for (let i = expenses.length - 1; i >= 0; i--) {
    if (normalizeForMatch(expenses[i].descricao).trim() === descNorm) { anterior = expenses[i]; break; }
  }
  let categoria = anterior?.categoria || null;
  if (!categoria) {
    const texto = ' ' + descNorm + ' ';
    for (const catId of Object.keys(CATEGORY_KEYWORDS)) {
      if (CATEGORY_KEYWORDS[catId].some(w => texto.includes(normalizeForMatch(w)))) { categoria = catId; break; }
    }
  }
  if (!categoria || !CATEGORIES.some(c => c.id === categoria)) categoria = 'outros';

  // ── rateio / grupo ──
  let rateio = null, grupoId = null;
  if (dividir) {
    const outro = _qaOutroMembro();
    const nome = comNome || outro?.nome || null;
    if (nome) {
      rateio = { com: nome, percentual: 50, pagoPorMim: true };
      if (window.meuGrupo) {
        const membros = Object.entries(window.meuGrupoMembrosMap || {});
        const achou = membros.find(([id, n]) => id !== currentUser?.id && normalizeForMatch(n).startsWith(normalizeForMatch(nome)));
        if (achou || (!comNome && outro)) grupoId = window.meuGrupo.id;
      }
    } else {
      avisos.push('Diga com quem: "dividido com Maria"');
    }
  }

  return { descricao: desc, valor, valorTotal, totalParcelas, tipo, data: _qaIso(data), dataObj: data,
           categoria, rateio, grupoId, pago, avisos };
}

function _qaDataLabel(d) {
  const h = new Date(); h.setHours(12, 0, 0, 0);
  const diff = Math.round((d - h) / 86400000);
  if (diff === 0)  return 'hoje';
  if (diff === -1) return 'ontem';
  if (diff === 1)  return 'amanhã';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function describeQuickAdd(p) {
  const cat = CATEGORIES.find(c => c.id === p.categoria) || CATEGORIES[CATEGORIES.length - 1];
  const partes = [`${cat.emoji} ${sanitize(p.descricao)}`];
  if (p.tipo === 'parcelado') partes.push(`${p.totalParcelas}x de ${formatBRL(p.valor)} (total ${formatBRL(p.valorTotal)})`);
  else partes.push(formatBRL(p.valor));
  partes.push(_qaDataLabel(p.dataObj));
  if (p.tipo === 'fixo') partes.push('fixo todo mês');
  if (p.rateio) partes.push(`dividido com ${sanitize(p.rateio.com)}`);
  if (p.pago) partes.push('já pago');
  return partes.join(' · ');
}

// ── UI ──
function buildQuickAddHtml(key) {
  return `
    <div class="qa-row">
      <input type="text" id="qaInput-${key}" class="qa-input" placeholder="Lançar rápido: mercado 85 ontem"
             autocomplete="off" autocapitalize="sentences" enterkeyhint="send"
             aria-label="Lançar despesa rápido, por texto"
             oninput="updateQuickPreview('${key}')"
             onkeydown="if(event.key==='Enter'){event.preventDefault();submitQuickAdd('${key}')}">
      <button type="button" class="qa-send" onclick="submitQuickAdd('${key}')" aria-label="Lançar despesa">
        <svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg>
      </button>
    </div>
    <div class="qa-preview" id="qaPreview-${key}" aria-live="polite"></div>
    <div class="qa-chips" id="qaChips-${key}"></div>
  `;
}

function updateQuickPreview(key) {
  const input = document.getElementById('qaInput-' + key);
  const prev  = document.getElementById('qaPreview-' + key);
  if (!input || !prev) return;
  const txt = input.value.trim();
  if (!txt) { prev.textContent = ''; prev.classList.remove('ok'); return; }
  const p = parseQuickAdd(txt);
  if (!p) { prev.textContent = 'Falta o valor — ex.: mercado 85'; prev.classList.remove('ok'); return; }
  prev.innerHTML = describeQuickAdd(p) + (p.avisos.length ? `<br><span class="qa-warn">${sanitize(p.avisos[0])}</span>` : '');
  prev.classList.add('ok');
}

// Atalhos: as descrições que você mais usa, com o último valor
function refreshQuickChips() {
  if (!Array.isArray(expenses) || expenses.length < 3) {
    document.querySelectorAll('.qa-chips').forEach(c => c.innerHTML = '');
    return;
  }
  const grupos = {};
  expenses.forEach(e => {
    const k = normalizeForMatch(e.descricao).trim();
    if (!k) return;
    const g = grupos[k] || (grupos[k] = { n: 0, ultimo: e });
    g.n++;
    if (e.dataOriginal >= g.ultimo.dataOriginal) g.ultimo = e;
  });
  const top = Object.values(grupos)
    .filter(g => g.n >= 2 && g.ultimo.tipo !== 'parcelado')
    .sort((a, b) => b.n - a.n).slice(0, 5);
  const html = top.map(g => {
    const txt = `${g.ultimo.descricao} ${g.ultimo.valor.toFixed(2).replace('.', ',')}`;
    return `<button type="button" class="qa-chip" data-txt="${sanitize(txt)}" onclick="useQuickChip(this)">${sanitize(g.ultimo.descricao)}</button>`;
  }).join('');
  document.querySelectorAll('.qa-chips').forEach(c => c.innerHTML = html);
}

function useQuickChip(btn) {
  const wrap = btn.closest('.quick-add');
  const input = wrap && wrap.querySelector('.qa-input');
  if (!input) return;
  input.value = btn.dataset.txt;
  input.dispatchEvent(new Event('input'));
  input.focus();
}

async function submitQuickAdd(key) {
  const input = document.getElementById('qaInput-' + key);
  if (!input) return;
  const p = parseQuickAdd(input.value);
  if (!p) { showToast('⚠️ Digite o item e o valor — ex.: mercado 85'); input.focus(); return; }

  const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
  const monthKey = getMonthKey(p.dataObj.getFullYear(), p.dataObj.getMonth());
  const nova = {
    id, descricao: p.descricao, valor: p.valor, dataOriginal: p.data, categoria: p.categoria,
    tipo: p.tipo, totalParcelas: p.totalParcelas, monthKey,
    pagamentos: p.pago ? { [monthKey]: true } : {},
    nota: '', rateio: p.rateio, grupoId: p.grupoId, valorTotal: p.valorTotal,
    user_id: currentUser?.id
  };
  expenses.push(nova);

  // leva a tela para o mês onde a despesa caiu, pra ela aparecer na hora
  if (p.dataObj.getFullYear() !== currentYear || p.dataObj.getMonth() !== currentMonth) {
    currentYear = p.dataObj.getFullYear(); currentMonth = p.dataObj.getMonth();
    updateMonthLabel();
  }

  window._novaDespesaId = id;
  input.value = '';
  updateQuickPreview(key);
  await persistExpenses();
  renderAll();
  refreshQuickChips();
  window._novaDespesaId = null;
  showToast(`✅ ${p.descricao} · ${formatBRL(p.tipo === 'parcelado' ? p.valor : p.valor)} lançado!`);
  if (p.avisos.length) setTimeout(() => showToast('ℹ️ ' + p.avisos[0]), 2600);
}

function initQuickAdd() {
  document.querySelectorAll('.quick-add[data-qa]').forEach(el => {
    el.innerHTML = buildQuickAddHtml(el.dataset.qa);
  });
}
initQuickAdd();
