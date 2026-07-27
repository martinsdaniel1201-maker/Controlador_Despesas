// PWA
// ═══════════════════════════════════════════════
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBanner').classList.add('visible');
});

document.getElementById('btnInstall').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('installBanner').classList.remove('visible');
});

document.getElementById('btnInstallClose').addEventListener('click', () => {
  document.getElementById('installBanner').classList.remove('visible');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado com sucesso!', reg))
      .catch(err => console.log('Erro ao registrar o Service Worker:', err));
  });
}

// NOVO: botão "Buscar atualizações" — limpa caches do PWA/Service Worker
// e recarrega direto do GitHub, ignorando qualquer versão antiga guardada.
async function forceUpdate() {
  const btn = document.getElementById('btnForceUpdate');
  const sub = document.getElementById('updateCardSub');
  btn.disabled = true;
  btn.style.opacity = '0.7';
  if (sub) sub.textContent = 'Atualizando...';

  // Registra que o usuário verificou agora, para não exibir o badge de novo tão cedo
  localStorage.setItem('lastUpdateCheck', Date.now().toString());
  updateUpdateBadge();

  try {
    // 1) Apaga todos os caches criados pelo Service Worker (cache do App Shell/PWA)
    if ('caches' in window) {
      const nomes = await caches.keys();
      await Promise.all(nomes.map(nome => caches.delete(nome)));
    }

    // 2) Desregistra o Service Worker atual, para que uma nova versão
    //    seja instalada do zero na próxima carga (evita servir sw.js antigo)
    if ('serviceWorker' in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registros.map(reg => reg.unregister()));
    }

    showToast('🔄 Cache limpo! Buscando versão mais recente...');
  } catch (e) {
    console.log('Erro ao limpar cache:', e);
  } finally {
    // 3) Recarrega a página forçando bypass do cache do navegador,
    //    garantindo que o index.html mais novo do GitHub seja buscado.
    setTimeout(() => {
      // location.reload(true) é obsoleto em navegadores modernos, então
      // adicionamos um parâmetro único na URL para "furar" o cache HTTP.
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now());
      window.location.replace(url.toString());
    }, 600);
  }
}

// ═══════════════════════════════════════════════
