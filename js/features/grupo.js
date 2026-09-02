// ═══════════════════════════════════════════════
// GRUPO COMPARTILHADO — Fase B
// Criar grupo, entrar por código de convite, ver membros, sair.
// A parte de "despesas da casa aparecerem juntas no dashboard" ainda
// não está aqui — por enquanto isso só cuida de montar o grupo em si.
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// GRUPO COMPARTILHADO — Fase B + C
// Criar grupo, entrar por código de convite, ver membros, sair,
// e marcar despesas como pertencentes ao grupo.
// ═══════════════════════════════════════════════

// Cache simples em memória — evita ficar consultando o banco toda hora
// só pra saber "esse usuário tem grupo? quem são os membros?"
window.meuGrupo = null;            // { id, nome, codigo_convite, criado_por }
window.meuGrupoMembrosMap = {};    // { userId: nomeDeExibição }

async function carregarMeuGrupoCache() {
  if (!supabaseClient || !currentUser) return;
  window.meuGrupo = await _getMeuGrupo();
  window.meuGrupoMembrosMap = {};
  if (window.meuGrupo) {
    const membros = await _getMembrosDoGrupo(window.meuGrupo.id);
    membros.forEach(m => { window.meuGrupoMembrosMap[m.id] = m.nome; });
  }
  atualizarSeletorDeGrupoNoFormulario();
  renderAll();
}

function getNomeDoMembro(userId) {
  if (userId === currentUser?.id) return 'você';
  return window.meuGrupoMembrosMap[userId] || 'um membro do grupo';
}

function openGrupoModal() {
  document.getElementById('grupoOverlay').classList.add('open');
  renderGrupoModal();
}

function closeGrupoModal() {
  document.getElementById('grupoOverlay').classList.remove('open');
}

// Mantém a tabela perfis_publicos em dia com nome/foto — chamada depois
// que o usuário salva o nome ou troca de foto, pra quem estiver no
// mesmo grupo conseguir ver "quem é quem" na lista de membros.
async function _upsertPerfilPublico() {
  if (!supabaseClient || !currentUser) return;
  try {
    await supabaseClient.from('perfis_publicos').upsert({
      user_id: currentUser.id,
      display_name: currentUser.user_metadata?.display_name || null,
      avatar_url: currentUser.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.error('Erro ao atualizar perfil público:', e);
  }
}

async function _getMeuGrupo() {
  const { data: membro, error } = await supabaseClient
    .from('grupo_membros')
    .select('grupo_id')
    .eq('user_id', currentUser.id)
    .limit(1)
    .maybeSingle();
  if (error || !membro) return null;

  const { data: grupo, error: grupoError } = await supabaseClient
    .from('grupos')
    .select('id, nome, codigo_convite, criado_por, permite_membros_editar')
    .eq('id', membro.grupo_id)
    .maybeSingle();
  if (grupoError || !grupo) return null;
  return grupo;
}

async function _getMembrosDoGrupo(grupoId) {
  const { data: membros, error } = await supabaseClient
    .from('grupo_membros')
    .select('user_id')
    .eq('grupo_id', grupoId);
  if (error || !membros?.length) return [];

  const ids = membros.map(m => m.user_id);
  const { data: perfis } = await supabaseClient
    .from('perfis_publicos')
    .select('user_id, display_name, avatar_url')
    .in('user_id', ids);

  return ids.map(id => {
    const p = perfis?.find(pp => pp.user_id === id);
    const souEu = id === currentUser.id;
    return {
      id,
      nome: souEu ? 'Você' : (p?.display_name || 'Membro'),
      avatar: p?.avatar_url || null,
    };
  });
}

async function renderGrupoModal() {
  const box = document.getElementById('grupoContent');
  box.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:20px 0;">Carregando...</p>`;

  const grupo = await _getMeuGrupo();

  if (!grupo) {    box.innerHTML = `
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Crie um grupo pra dividir despesas com quem mora com você, ou entre num grupo existente com um código de convite.
      </p>
      <div class="form-group">
        <label class="form-label" for="novoGrupoNome">Criar um grupo novo</label>
        <input type="text" class="form-input" id="novoGrupoNome" placeholder="Ex: Casa, Família..." autocomplete="off">
      </div>
      <button class="btn-save" onclick="criarGrupo()"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-users"></use></svg> Criar grupo</button>

      <hr class="dash-card-divider">

      <div class="form-group">
        <label class="form-label" for="codigoConviteInput">Entrar com um código de convite</label>
        <input type="text" class="form-input" id="codigoConviteInput" placeholder="Ex: a1b2c3d4" autocomplete="off" maxlength="12">
      </div>
      <button class="btn-cancel" onclick="entrarComCodigo()" style="border-color:var(--brand);color:var(--brand-dark);">Entrar no grupo</button>
      <p id="grupoErro" style="color:var(--red);font-size:12.5px;font-weight:700;margin-top:10px;min-height:16px;"></p>
    `;
    return;
  }

  const membros = await _getMembrosDoGrupo(grupo.id);
  const souCriador = grupo.criado_por === currentUser.id;

  box.innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:17px;font-weight:900;color:var(--text);">${sanitize(grupo.nome)}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${membros.length} membro${membros.length > 1 ? 's' : ''}</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
      ${membros.map(m => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg);border-radius:12px;">
          ${m.avatar
            ? `<img src="${m.avatar}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:32px;height:32px;border-radius:50%;background:var(--brand-light);color:var(--brand-dark);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;">${sanitize(m.nome.charAt(0).toUpperCase())}</div>`}
          <span style="font-size:13.5px;font-weight:700;color:var(--text);">${sanitize(m.nome)}</span>
        </div>
      `).join('')}
    </div>

    <div class="form-group">
      <label class="form-label">Código de convite (compartilhe com quem quiser adicionar)</label>
      <div style="display:flex;gap:8px;">
        <input type="text" class="form-input" value="${sanitize(grupo.codigo_convite)}" readonly style="font-weight:900;letter-spacing:1px;">
        <button class="btn-cancel" style="margin:0;white-space:nowrap;" onclick="copiarCodigoConvite('${sanitize(grupo.codigo_convite)}')">Copiar</button>
      </div>
    </div>

    ${souCriador ? `
      <hr class="dash-card-divider">
      <div class="form-group">
        <label class="form-label" for="renomearGrupoInput">Nome do grupo</label>
        <div style="display:flex;gap:8px;">
          <input type="text" class="form-input" id="renomearGrupoInput" value="${sanitize(grupo.nome)}" autocomplete="off">
          <button class="btn-cancel" style="margin:0;white-space:nowrap;" onclick="renomearGrupo('${grupo.id}')">Salvar</button>
        </div>
      </div>

      <div class="repeat-card" style="margin-bottom:14px;">
        <div class="toggle-row" onclick="togglePermiteMembrosEditar('${grupo.id}', ${!grupo.permite_membros_editar})" role="button" tabindex="0">
          <span class="toggle-label">Membros podem editar/marcar como pago</span>
          <button class="toggle${grupo.permite_membros_editar ? ' on' : ''}" aria-checked="${!!grupo.permite_membros_editar}" role="switch" tabindex="-1"></button>
        </div>
        <p style="font-size:11.5px;color:var(--text-muted);margin-top:8px;">
          Excluir uma despesa continua sendo possível só por quem lançou ela, mesmo com isso ligado.
        </p>
      </div>
    ` : ''}

    <button class="btn-cancel" style="border-color:var(--red);color:var(--red);margin-top:8px;" onclick="sairDoGrupo('${grupo.id}')">
      ${souCriador ? 'Excluir grupo' : 'Sair do grupo'}
    </button>
  `;
}

async function renomearGrupo(grupoId) {
  const novoNome = document.getElementById('renomearGrupoInput').value.trim();
  if (!novoNome) { showToast('O nome não pode ficar vazio'); return; }
  try {
    const { error } = await supabaseClient.from('grupos').update({ nome: novoNome }).eq('id', grupoId);
    if (error) throw error;
    showToast('✅ Nome atualizado!');
    carregarMeuGrupoCache();
    renderGrupoModal();
  } catch (e) {
    console.error('Erro ao renomear grupo:', e);
    showToast('❌ Não foi possível renomear agora');
  }
}

async function togglePermiteMembrosEditar(grupoId, novoValor) {
  try {
    const { error } = await supabaseClient.from('grupos').update({ permite_membros_editar: novoValor }).eq('id', grupoId);
    if (error) throw error;
    showToast(novoValor ? '✅ Membros já podem editar despesas do grupo' : 'Edição pelos membros desativada');
    carregarMeuGrupoCache();
    renderGrupoModal();
  } catch (e) {
    console.error('Erro ao atualizar permissão do grupo:', e);
    showToast('❌ Não foi possível atualizar agora');
  }
}

async function criarGrupo() {
  const nome = document.getElementById('novoGrupoNome').value.trim();
  if (!nome) { showToast('Dá um nome pro grupo primeiro'); return; }
  try {
    const { error } = await supabaseClient.rpc('create_group', { nome_grupo: nome });
    if (error) throw error;
    await _upsertPerfilPublico();
    showToast('✅ Grupo criado!');
    carregarMeuGrupoCache();
    renderGrupoModal();
  } catch (e) {
    console.error('Erro ao criar grupo:', e);
    showToast('❌ Não foi possível criar o grupo agora');
  }
}

async function entrarComCodigo() {
  const codigo = document.getElementById('codigoConviteInput').value.trim();
  const erroEl = document.getElementById('grupoErro');
  erroEl.textContent = '';
  if (!codigo) return;
  try {
    const { error } = await supabaseClient.rpc('join_group_by_code', { code: codigo });
    if (error) throw error;
    await _upsertPerfilPublico();
    showToast('✅ Você entrou no grupo!');
    carregarMeuGrupoCache();
    renderGrupoModal();
  } catch (e) {
    console.error('Erro ao entrar no grupo:', e);
    erroEl.textContent = 'Código inválido — confira e tente de novo.';
  }
}

async function sairDoGrupo(grupoId) {
  const confirmar = await mostrarPopup({
    emoji: '👋',
    titulo: 'Sair do grupo?',
    texto: 'Suas despesas continuam com você — só o vínculo com o grupo é desfeito.',
    botoes: [
      { texto: 'Sim, sair', classe: 'confirm-btn-danger', valor: true },
      { texto: 'Cancelar', classe: 'confirm-btn-secondary', valor: false }
    ]
  });
  if (!confirmar) return;
  try {
    const { error } = await supabaseClient
      .from('grupo_membros')
      .delete()
      .eq('grupo_id', grupoId)
      .eq('user_id', currentUser.id);
    if (error) throw error;
    showToast('Você saiu do grupo');
    carregarMeuGrupoCache();
    renderGrupoModal();
  } catch (e) {
    console.error('Erro ao sair do grupo:', e);
    showToast('❌ Não foi possível sair agora');
  }
}

function copiarCodigoConvite(codigo) {
  navigator.clipboard?.writeText(codigo)
    .then(() => showToast('📋 Código copiado!'))
    .catch(() => showToast('Não foi possível copiar automaticamente'));
}
