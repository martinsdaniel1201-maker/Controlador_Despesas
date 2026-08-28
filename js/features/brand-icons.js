// ═══════════════════════════════════════════════
// LOGOS DE EMPRESAS NAS DESPESAS
// Em vez de guardar/reproduzir o logo de cada empresa aqui no
// código, buscamos o ícone oficial do site dela ao vivo, via um
// serviço público de favicon (não requer chave, não tem custo).
// Se não reconhecer a empresa, cai no emoji da categoria normalmente.
// ═══════════════════════════════════════════════

const BRAND_DOMAINS = {
  nubank:        'nubank.com.br',
  picpay:        'picpay.com',
  itau:          'itau.com.br',
  bradesco:      'bradesco.com.br',
  santander:     'santander.com.br',
  'banco do brasil': 'bb.com.br',
  caixa:         'caixa.gov.br',
  inter:         'bancointer.com.br',
  c6:            'c6bank.com.br',
  next:          'next.me',
  neon:          'neon.com.br',
  'mercado pago': 'mercadopago.com.br',
  mercadopago:   'mercadopago.com.br',
  pagbank:       'pagbank.com.br',
  pagseguro:     'pagseguro.uol.com.br',
  will:          'willbank.com.br',
  sicoob:        'sicoob.com.br',
  sicredi:       'sicredi.com.br',
  btg:           'btgpactual.com',
  original:      'original.com.br',
  // assinaturas/serviços recorrentes comuns — bônus, mesmo raciocínio
  netflix:       'netflix.com',
  spotify:       'spotify.com',
  amazon:        'amazon.com.br',
  ifood:         'ifood.com.br',
  uber:          'uber.com',
  'disney':      'disneyplus.com',
};

function _normalizeForBrandMatch(txt) {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

// Retorna a URL do favicon oficial se reconhecer a empresa no texto, ou null.
function getBrandLogoUrl(text) {
  const norm = _normalizeForBrandMatch(text);
  if (!norm) return null;
  for (const key in BRAND_DOMAINS) {
    if (norm.includes(key)) {
      return `https://www.google.com/s2/favicons?domain=${BRAND_DOMAINS[key]}&sz=64`;
    }
  }
  return null;
}
