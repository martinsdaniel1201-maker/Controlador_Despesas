// CATEGORIAS PERSONALIZADAS
// Guardadas em localStorage e mescladas em CATEGORIES/CAT_COLORS
// para que todo o resto do app (filtros, gráficos, listas) funcione sem mudanças.
// ═══════════════════════════════════════════════
function loadCustomCategories() {
  try {
    const raw = localStorage.getItem('customCategories');
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    list.forEach(c => {
      if (!c || !c.id || CATEGORIES.some(existing => existing.id === c.id)) return;
      CATEGORIES.splice(CATEGORIES.length - 1, 0, { id: c.id, label: c.label, emoji: c.emoji || '📌', custom: true });
      CAT_COLORS[c.id] = c.color || '#888888';
    });
  } catch (e) { console.warn('Falha ao carregar categorias personalizadas', e); }
}

function saveCustomCategoriesList(list) {
  localStorage.setItem('customCategories', JSON.stringify(list));
}

function getCustomCategoriesList() {
  try {
    const raw = localStorage.getItem('customCategories');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function addCustomCategory(label, emoji, color) {
  label = (label || '').trim();
  if (!label) { showToast('Digite um nome para a categoria'); return false; }
  const id = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' + Date.now().toString(36);
  const list = getCustomCategoriesList();
  list.push({ id, label, emoji: emoji || '📌', color: color || '#7f8c8d' });
  saveCustomCategoriesList(list);
  CATEGORIES.splice(CATEGORIES.length - 1, 0, { id, label, emoji: emoji || '📌', custom: true });
  CAT_COLORS[id] = color || '#7f8c8d';
  return id;
}

function removeCustomCategory(id) {
  const list = getCustomCategoriesList().filter(c => c.id !== id);
  saveCustomCategoriesList(list);
  const idx = CATEGORIES.findIndex(c => c.id === id);
  if (idx >= 0) CATEGORIES.splice(idx, 1);
  delete CAT_COLORS[id];
}

// ── Aplica a lista de categorias vinda da nuvem (login/sincronização) ──
// Substitui as categorias personalizadas locais pelas da nuvem, evitando duplicatas.
function applyCategoriesFromCloud(cloudList) {
  const existingCustomIds = CATEGORIES.filter(c => c.custom).map(c => c.id);
  existingCustomIds.forEach(id => {
    const idx = CATEGORIES.findIndex(c => c.id === id);
    if (idx >= 0) CATEGORIES.splice(idx, 1);
    delete CAT_COLORS[id];
  });
  saveCustomCategoriesList(cloudList);
  loadCustomCategories();
}

// ── Envia as categorias personalizadas locais para o Supabase ──
// Reaproveita o array `expenses` já carregado em memória para não sobrescrever despesas.
async function syncCategoriesToSupabase() {
  if (!supabaseClient || !currentUser) return; // modo local/offline: fica só no localStorage
  try {
    const list = getCustomCategoriesList();
    const { error } = await supabaseClient
      .from('expenses')
      .upsert(
        { user_id: currentUser.id, data: expenses, categories: list, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
  } catch (e) {
    console.error('Erro ao sincronizar categorias com o Supabase:', e);
    showToast('⚠️ Categoria salva localmente, mas falhou ao sincronizar');
  }
}

loadCustomCategories();

// ═══════════════════════════════════════════════
// FORMULÁRIO: NOVA CATEGORIA
// ═══════════════════════════════════════════════
function openNewCategoryForm() {
  document.getElementById('newCatEmoji').value = '📌';
  document.getElementById('newCatLabel').value = '';
  document.getElementById('newCatColor').value = '#7f8c8d';
  document.getElementById('newCatOverlay').classList.add('open');
  setTimeout(() => document.getElementById('newCatLabel').focus(), 50);
}

function closeNewCategoryForm() {
  document.getElementById('newCatOverlay').classList.remove('open');
}

function confirmNewCategory() {
  const label = document.getElementById('newCatLabel').value.trim();
  const emoji = document.getElementById('newCatEmoji').value.trim() || '📌';
  const color = document.getElementById('newCatColor').value || '#7f8c8d';
  if (!label) { document.getElementById('newCatLabel').classList.add('error'); return; }
  const id = addCustomCategory(label, emoji, color);
  if (id) {
    selectedCat = id;
    renderCatChips();
    closeNewCategoryForm();
    showToast('✅ Categoria "' + label + '" criada!');
    syncCategoriesToSupabase();
  }
}

// ═══════════════════════════════════════════════
// GERENCIAR CATEGORIAS PERSONALIZADAS
// ═══════════════════════════════════════════════
function openManageCategories() {
  renderManageCatList();
  document.getElementById('manageCatOverlay').classList.add('open');
}
function closeManageCategories() {
  document.getElementById('manageCatOverlay').classList.remove('open');
}

function renderManageCatList() {
  const container = document.getElementById('manageCatList');
  container.innerHTML = '';
  const custom = getCustomCategoriesList();

  if (custom.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-muted);font-size:14px;text-align:center;padding:12px 0';
    p.textContent = 'Você ainda não criou categorias personalizadas.';
    container.appendChild(p);
    return;
  }

  custom.forEach(c => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border);';

    const emojiSpan = document.createElement('span');
    emojiSpan.style.fontSize = '20px';
    emojiSpan.textContent = c.emoji || '📌';

    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = 'flex:1;font-weight:800;font-size:14px;color:var(--text);';
    nameSpan.textContent = c.label;                      // textContent → XSS-safe

    const colorDot = document.createElement('span');
    colorDot.style.cssText = `width:14px;height:14px;border-radius:50%;background:${c.color || '#888'};display:inline-block;`;

    const delBtn = document.createElement('button');
    delBtn.setAttribute('aria-label', 'Remover categoria ' + c.label);
    delBtn.style.cssText = 'background:none;border:none;color:var(--red);cursor:pointer;padding:4px 8px;display:flex;align-items:center;';
    delBtn.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-trash"></use></svg>';
    delBtn.onclick = () => confirmDeleteCategory(c.id, c.label);

    row.appendChild(emojiSpan);
    row.appendChild(nameSpan);
    row.appendChild(colorDot);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

async function confirmDeleteCategory(id, label) {
  const emUso = expenses.some(e => e.categoria === id);
  const confirmar = await mostrarPopup({
    emoji: '⚠️',
    titulo: 'Remover categoria?',
    texto: emUso
      ? `"${label}" está em uso em uma ou mais despesas. Elas ficarão marcadas como "Outros". Deseja continuar?`
      : `Tem certeza que deseja remover a categoria "${label}"?`,
    botoes: [
      { texto: 'Remover',   classe: 'confirm-btn-danger',    valor: true },
      { texto: 'Cancelar',  classe: 'confirm-btn-secondary', valor: false }
    ]
  });
  if (!confirmar) return;
  removeCustomCategory(id);
  if (emUso) {
    expenses.forEach(e => { if (e.categoria === id) e.categoria = 'outros'; });
    await persistExpenses();
  }
  renderManageCatList();
  showToast('Categoria removida');
  renderAll();
  syncCategoriesToSupabase();
}

function selectCat(id) { selectedCat = id; _catUserPicked = true; renderCatChips(); }

