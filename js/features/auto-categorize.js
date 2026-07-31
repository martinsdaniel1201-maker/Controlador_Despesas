// ═══════════════════════════════════════════════════════════
// SUGESTÃO AUTOMÁTICA DE CATEGORIA (por palavra-chave, sem IA)
// ═══════════════════════════════════════════════════════════
// Ao digitar a descrição, se o texto bater com alguma palavra-chave
// conhecida, a categoria correspondente é pré-selecionada. O usuário
// pode sempre trocar manualmente — a partir do momento em que ele
// toca em uma categoria, a sugestão automática para de agir nesse
// lançamento (ver _catUserPicked, controlado em selectCat()).
// ═══════════════════════════════════════════════════════════
const CATEGORY_KEYWORDS = {
  transporte:  ['uber', '99 ', '99app', 'taxi', 'gasolina', 'combustivel', 'estacionamento', 'onibus', 'metro', 'pedagio', 'oficina mecanica'],
  alimentacao: ['mercado', 'supermercado', 'ifood', 'restaurante', 'lanchonete', 'padaria', 'feira', 'acougue', 'hortifruti'],
  moradia:     ['aluguel', 'condominio', 'iptu', 'luz', 'energia eletrica', 'conta de agua', 'gas de cozinha'],
  saude:       ['farmacia', 'remedio', 'consulta medica', 'medico', 'dentista', 'plano de saude', 'exame', 'academia'],
  lazer:       ['cinema', 'netflix', 'spotify', 'show', 'viagem', 'passagem aerea', 'bar ', 'balada', 'ingresso'],
  compras:     ['shopee', 'amazon', 'mercado livre', 'magazine luiza', 'shopping', 'roupa', 'sapato', 'tenis'],
  servicos:    ['internet', 'celular', 'plano de celular', 'assinatura', 'streaming'],
  educacao:    ['faculdade', 'curso', 'mensalidade escolar', 'material escolar', 'livro didatico'],
};

let _catUserPicked = false;

function normalizeForMatch(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

function suggestCategoryFromDescription() {
  if (_catUserPicked) return;
  const el = document.getElementById('fDesc');
  if (!el) return;
  const text = normalizeForMatch(el.value);
  if (text.trim().length < 3) return;

  for (const catId of Object.keys(CATEGORY_KEYWORDS)) {
    const hit = CATEGORY_KEYWORDS[catId].some(word => text.includes(normalizeForMatch(word)));
    if (hit) {
      if (selectedCat !== catId && CATEGORIES.some(c => c.id === catId)) {
        selectedCat = catId;
        renderCatChips();
      }
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════
