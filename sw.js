// 1. TODA VEZ que você mudar algo no HTML/CSS, mude essa versão (ex: v2, v3, v4...)
const CACHE_NAME = 'controlador-despesas-v19'; 

const ASSETS = [
  './',
  './index.html',
  './icone-192.png',
  './icone-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './manifest.json',
  './css/accessibility.css',
  './css/auth-screen.css',
  './css/badges-misc.css',
  './css/compact-mode.css',
  './css/drawer.css',
  './css/expense-list.css',
  './css/icons.css',
  './css/inline-edit.css',
  './css/layout.css',
  './css/modal.css',
  './css/stats.css',
  './css/dashboard.css',
  './css/simulacoes.css',
  './css/stats-charts.css',
  './css/microinteractions.css',
  './css/theme.css',
  './js/main.js',
  './js/ui/modal.js',
  './js/ui/navigation.js',
  './js/ui/popup.js',
  './js/ui/render-historico.js',
  './js/ui/render-home.js',
  './js/ui/render-list.js',
  './js/ui/render-simulacoes.js',
  './js/ui/onboarding.js',
  './js/ui/charts.js',
  './js/ui/confetti.js',
  './js/ui/render-stats.js',
  './js/config/auth.js',
  './js/config/state.js',
  './js/config/supabase-client.js',
  './js/features/budgets.js',
  './js/features/categories.js',
  './js/features/darkmode.js',
  './js/features/data-cleanup.js',
  './js/features/expense-actions.js',
  './js/features/expense-form.js',
  './js/features/export-import.js',
  './js/features/insights.js',
  './js/features/score.js',
  './js/features/simulations.js',
  './js/features/smart-month.js',
  './js/features/app-badge.js',
  './js/features/auto-categorize.js',
  './js/features/month-share.js',
  './js/features/pix.js',
  './js/features/pwa.js',
  './js/features/reminders.js',
  './js/features/simulation.js',
  './js/data/constants.js',
  './js/data/migration.js',
  './js/data/persistence.js',
  './js/data/sync.js',
  './js/utils/date.js',
  './js/utils/format.js',
  './js/utils/masks.js',
  './js/utils/motivation.js',
  './js/utils/sanitize.js'
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
