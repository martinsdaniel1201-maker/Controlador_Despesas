// 1. TODA VEZ que você mudar algo no HTML/CSS, mude essa versão (ex: v2, v3, v4...)
const CACHE_NAME = 'controlador-despesas-v4.3'; 

const ASSETS = [
  './',
  './index.html',
  './icone-192.png',
  './manifest.json'
];

// Instala o Service Worker e guarda os arquivos no cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      // FORÇA o novo service worker a se tornar o ativo imediatamente,
      // sem esperar o usuário fechar todas as abas do app.
      return self.skipWaiting();
    })
  );
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Faz o novo Service Worker assumir o controle da página imediatamente
      return self.clients.claim();
    })
  );
});

// Intercepta as requisições para fazer o app funcionar offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Retorna o cache se existir, senão busca na rede
      return cachedResponse || fetch(e.request);
    })
  );
});
