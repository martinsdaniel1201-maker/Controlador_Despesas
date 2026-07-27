// METAS DE GASTO POR CATEGORIA
// ═══════════════════════════════════════════════
function loadCategoryBudgets() {
  try {
    return JSON.parse(localStorage.getItem('categoryBudgets') || '{}');
  } catch (e) { return {}; }
}
function saveCategoryBudget(catId, value) {
  const budgets = loadCategoryBudgets();
  if (value > 0) budgets[catId] = value;
  else delete budgets[catId];
  localStorage.setItem('categoryBudgets', JSON.stringify(budgets));
}

// ═══════════════════════════════════════════════
let _budgetEditingCatId = null;
function openCategoryBudgetEditor(catId) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;
  _budgetEditingCatId = catId;
  const budgets = loadCategoryBudgets();
  document.getElementById('catBudgetSubtitle').textContent = cat.emoji + ' ' + cat.label;
  document.getElementById('catBudgetValue').value = budgets[catId] ? formatBRL(budgets[catId]).replace('R$', '').trim() : '';
  document.getElementById('catBudgetOverlay').classList.add('open');
  setTimeout(() => document.getElementById('catBudgetValue').focus(), 50);
}
function closeCategoryBudgetEditor() {
  document.getElementById('catBudgetOverlay').classList.remove('open');
  _budgetEditingCatId = null;
}
function confirmCategoryBudget() {
  if (!_budgetEditingCatId) return;
  const raw = document.getElementById('catBudgetValue').value;
  const value = parseBRL(raw);
  saveCategoryBudget(_budgetEditingCatId, value);
  closeCategoryBudgetEditor();
  showToast(value > 0 ? '🎯 Meta salva!' : 'Meta removida');
  renderStats();
}

