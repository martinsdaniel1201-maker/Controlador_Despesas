// PIX — CHAVES CADASTRADAS & GERAÇÃO DE COBRANÇA
// (bloco novo e isolado: não lê nem escreve em `expenses`
//  diretamente, só reaproveita a variável pra não sobrescrever
//  no upsert, igual ao padrão já usado em syncCategoriesToSupabase)
// ═══════════════════════════════════════════════

function switchFerramenta(nome, el) {
  document.querySelectorAll('#tabSimulacao .filter-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('painelCalculadora').style.display = (nome === 'calc') ? '' : 'none';
  document.getElementById('painelPix').style.display = (nome === 'pix') ? '' : 'none';
}

function maskPixKey(tipo, chave) {
  if (!chave) return '';
  if (tipo === 'email') {
    const [user, dom] = chave.split('@');
    if (!dom) return chave;
    return (user.length > 2 ? user.slice(0, 2) : user) + '***@' + dom;
  }
  if (tipo === 'aleatoria') {
    return chave.length > 8 ? chave.slice(0, 4) + '••••••' + chave.slice(-4) : chave;
  }
  const digits = chave.replace(/\D/g, '');
  return digits.length >= 4 ? '•••••' + digits.slice(-4) : chave;
}

function renderPixKeysList() {
  const cont = document.getElementById('pixKeysList');
  const sel  = document.getElementById('pixChargeKeySelect');
  if (!cont || !sel) return;

  cont.innerHTML = '';
  sel.innerHTML = '';

  if (!pixKeys.length) {
    const vazio = document.createElement('div');
    vazio.style.cssText = 'text-align:center;padding:14px;color:var(--text-muted);font-size:13px;';
    vazio.textContent = 'Nenhuma chave cadastrada ainda.';
    cont.appendChild(vazio);
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Cadastre uma chave primeiro';
    sel.appendChild(opt);
    return;
  }

  pixKeys.forEach(k => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:12px;background:var(--border);margin-bottom:8px;';

    const info = document.createElement('div');
    const nomeEl = document.createElement('div');
    nomeEl.style.cssText = 'font-weight:800;font-size:14px;';
    nomeEl.textContent = k.apelido || 'Chave Pix';
    const detalhe = document.createElement('div');
    detalhe.style.cssText = 'font-size:12px;color:var(--text-muted);margin-top:2px;';
    detalhe.textContent = (k.tipo || '').toUpperCase() + ' · ' + maskPixKey(k.tipo, k.chave);
    info.appendChild(nomeEl);
    info.appendChild(detalhe);

    const del = document.createElement('button');
    del.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-trash"></use></svg>';
    del.setAttribute('aria-label', 'Excluir chave ' + (k.apelido || ''));
    del.style.cssText = 'background:none;border:none;color:var(--red);cursor:pointer;padding:6px;display:flex;align-items:center;';
    del.onclick = () => deletePixKey(k.id);

    row.appendChild(info);
    row.appendChild(del);
    cont.appendChild(row);

    const opt = document.createElement('option');
    opt.value = k.id;
    opt.textContent = (k.apelido || 'Chave') + ' (' + (k.tipo || '').toUpperCase() + ')';
    sel.appendChild(opt);
  });
}

function openPixKeyModal() {
  document.getElementById('pixKeyApelido').value = '';
  document.getElementById('pixKeyTipo').value = 'cpf';
  document.getElementById('pixKeyChave').value = '';
  document.getElementById('pixKeyNome').value = '';
  document.getElementById('pixKeyCidade').value = '';
  document.getElementById('pixKeyOverlay').classList.add('open');
  setTimeout(() => document.getElementById('pixKeyApelido').focus(), 50);
}

function closePixKeyModal() {
  document.getElementById('pixKeyOverlay').classList.remove('open');
}

function confirmNewPixKey() {
  const apelido = document.getElementById('pixKeyApelido').value.trim();
  const tipo    = document.getElementById('pixKeyTipo').value;
  const chave   = document.getElementById('pixKeyChave').value.trim();
  const nome    = document.getElementById('pixKeyNome').value.trim();
  const cidade  = document.getElementById('pixKeyCidade').value.trim().toUpperCase();

  if (!chave)  { document.getElementById('pixKeyChave').classList.add('error'); showToast('⚠️ Informe a chave Pix'); return; }
  if (!nome)   { document.getElementById('pixKeyNome').classList.add('error'); showToast('⚠️ Informe o nome do recebedor'); return; }
  if (!cidade) { document.getElementById('pixKeyCidade').classList.add('error'); showToast('⚠️ Informe a cidade'); return; }

  const novaChave = {
    id: 'pk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    apelido: apelido || nome,
    tipo, chave, nome, cidade
  };
  pixKeys.push(novaChave);
  persistPixKeys();
  renderPixKeysList();
  closePixKeyModal();
  showToast('✅ Chave Pix cadastrada!');
}

async function deletePixKey(id) {
  const confirmar = await mostrarPopup({
    emoji:  '🗑️',
    titulo: 'Excluir chave Pix?',
    texto:  'A chave será removida da sua lista. Isso não afeta suas despesas nem seu histórico.',
    botoes: [
      { texto: 'Sim, Excluir', classe: 'confirm-btn-danger',    valor: true  },
      { texto: 'Cancelar',     classe: 'confirm-btn-secondary', valor: false }
    ]
  });
  if (!confirmar) return;
  pixKeys = pixKeys.filter(k => k.id !== id);
  persistPixKeys();
  renderPixKeysList();
  showToast('🗑️ Chave removida.');
}

function persistPixKeys() {
  try { localStorage.setItem('pix_keys_v1', JSON.stringify(pixKeys)); } catch {}
  savePixKeysToSupabase();
}

// Reaproveita `data` (despesas) e `categories` já carregados em memória —
// mesmo padrão defensivo usado em syncCategoriesToSupabase — pra nunca
// sobrescrever essas colunas com valor vazio no upsert.
async function savePixKeysToSupabase() {
  if (!supabaseClient || !currentUser) return; // modo local/offline: fica só no localStorage
  try {
    const { error } = await supabaseClient
      .from('expenses')
      .upsert(
        { user_id: currentUser.id, data: expenses, categories: getCustomCategoriesList(), pix_keys: pixKeys, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
  } catch (e) {
    console.error('Erro ao sincronizar chaves Pix com o Supabase:', e);
    showToast('⚠️ Chave salva localmente, mas falhou ao sincronizar');
  }
}

// ── Gerador de código Pix Copia e Cola (BR Code / padrão EMV) ──
function crc16ccitt(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function emvField(id, value) {
  const len = String(value.length).padStart(2, '0');
  return id + len + value;
}

function sanitizePixText(str, maxLen) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, maxLen);
}

function buildPixPayload({ chave, nome, cidade, valor, descricao }) {
  const nomeClean   = sanitizePixText(nome, 25) || 'RECEBEDOR';
  const cidadeClean = sanitizePixText(cidade, 15) || 'BRASIL';
  const descClean   = descricao ? sanitizePixText(descricao, 25) : '';

  const merchantAccountInfo =
    emvField('00', 'br.gov.bcb.pix') +
    emvField('01', chave) +
    (descClean ? emvField('02', descClean) : '');

  let payload =
    emvField('00', '01') +                                  // Payload Format Indicator
    emvField('26', merchantAccountInfo) +                   // Info da conta Pix
    emvField('52', '0000') +                                // Merchant Category Code
    emvField('53', '986') +                                 // Moeda (BRL)
    (valor > 0 ? emvField('54', valor.toFixed(2)) : '') +   // Valor
    emvField('58', 'BR') +                                  // País
    emvField('59', nomeClean) +                             // Nome do recebedor
    emvField('60', cidadeClean) +                           // Cidade
    emvField('62', emvField('05', '***'));                  // Txid genérico

  payload += '6304'; // campo do CRC (id+tamanho); o valor é calculado a seguir
  return payload + crc16ccitt(payload);
}

let ultimaCobrancaGerada = null;

function gerarCobrancaPix() {
  const alertBox = document.getElementById('pixAlertContainer');
  if (alertBox) alertBox.innerHTML = '';

  const keyId = document.getElementById('pixChargeKeySelect').value;
  const chaveObj = pixKeys.find(k => k.id === keyId);
  if (!chaveObj) { showToast('⚠️ Cadastre e selecione uma chave Pix primeiro'); return; }

  const valor = parseBRL(document.getElementById('pixChargeValor').value);
  const valorInput = document.getElementById('pixChargeValor');
  if (!(valor > 0)) {
    valorInput.classList.add('error');
    showToast('⚠️ Informe um valor válido');
    return;
  }
  valorInput.classList.remove('error');

  const descricao = document.getElementById('pixChargeDesc').value.trim();

  const codigo = buildPixPayload({
    chave: chaveObj.chave,
    nome: chaveObj.nome,
    cidade: chaveObj.cidade,
    valor,
    descricao
  });

  ultimaCobrancaGerada = { codigo, valor, descricao };

  document.getElementById('pixChargeCodigo').value = codigo;
  document.getElementById('pixChargeResult').style.display = 'block';
}

function copiarCodigoPix() {
  const el = document.getElementById('pixChargeCodigo');
  el.select();
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(el.value)
      .then(() => showToast('📋 Código copiado!'))
      .catch(() => showToast('⚠️ Não foi possível copiar automaticamente'));
  } else {
    try { document.execCommand('copy'); showToast('📋 Código copiado!'); }
    catch { showToast('⚠️ Não foi possível copiar automaticamente'); }
  }
}

function enviarCobrancaWhatsApp() {
  if (!ultimaCobrancaGerada) return;
  const { valor, descricao } = ultimaCobrancaGerada;
  const valorFmt = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let msg = 'Oi! Segue a cobrança de R$ ' + valorFmt;
  if (descricao) msg += ' referente a: ' + descricao;
  msg += '\n\nJá te mando o código Pix Copia e Cola na próxima mensagem 👇';
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

// Mensagem separada contendo SOMENTE o código — assim quem recebe consegue
// apertar e segurar a bolha da mensagem no WhatsApp e copiar só o código,
// sem nenhum texto extra junto.
function enviarCodigoWhatsApp() {
  if (!ultimaCobrancaGerada) return;
  window.open('https://wa.me/?text=' + encodeURIComponent(ultimaCobrancaGerada.codigo), '_blank');
}

// ═══════════════════════════════════════════════
