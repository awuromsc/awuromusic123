/* APATHY Chrome Music Player — Service Worker (v35 Offline Shell & Artwork Cache) */
const SHELL_CACHE = 'apathy-shell-v35';
const ART_CACHE = 'apathy-art-v35';

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css?v=32',
  './app.js?v=32',
  './manifest.json',
  './icon.png',
  './bg-chrome.jpg',
  './bg-purple.jpg',
  './bg-red.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ART_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const resp = await fetch(request, { signal: ctrl.signal });
    clearTimeout(timer);
    if (resp && resp.ok) {
      cache.put('./index.html', resp.clone()).catch(() => {});
      return resp;
    }
  } catch (e) {}
  return (await cache.match('./index.html')) || (await cache.match('./')) || new Response('Offline', { status: 503 });
}

async function cacheFirstAsset(request, cacheName, maxEntries = 0) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp && (resp.ok || resp.type === 'opaque')) {
      cache.put(request, resp.clone()).then(async () => {
        if (maxEntries > 0) {
          const keys = await cache.keys();
          if (keys.length > maxEntries) {
            for (let i = 0; i < keys.length - maxEntries; i++) {
              await cache.delete(keys[i]);
            }
          }
        }
      }).catch(() => {});
    }
    return resp;
  } catch (e) {
    const fallback = await cache.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    return new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept API calls, audio streams (stored in IndexedDB), or Telegram SDK
  if (
    url.pathname.startsWith('/api/tg/stream/') ||
    url.pathname.startsWith('/api/tg/search') ||
    url.pathname.startsWith('/api/tg/library') ||
    url.pathname.startsWith('/api/tg/ping') ||
    url.pathname.startsWith('/api/tg/resolve') ||
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/user/me') ||
    url.pathname.startsWith('/api/user/sync') ||
    url.pathname.startsWith('/api/user/logout') ||
    url.hostname.includes('lrclib.net') ||
    url.hostname.includes('telegram.org')
  ) {
    return;
  }

  // Page navigations -> network-first with instant offline fallback to index.html
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // Same-origin static shell files
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    event.respondWith(cacheFirstAsset(req, SHELL_CACHE, 0));
    return;
  }

  // Track artwork & user avatars from BotHost / ytimg / sndcdn -> cache for offline display
  if (
    req.destination === 'image' ||
    url.pathname.startsWith('/api/tg/thumb/') ||
    url.pathname.startsWith('/api/user/avatar/') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('sndcdn.com')
  ) {
    event.respondWith(cacheFirstAsset(req, ART_CACHE, 120));
  }
});
