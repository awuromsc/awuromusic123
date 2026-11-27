/* APATHY Chrome Music Player — Service Worker (v52 iOS Standalone Offline Fix) */
const SHELL_CACHE = 'apathy-shell-v52';
const ART_CACHE = 'apathy-art-v52';

const SHELL_ASSETS = [
  '/',
  '/style.css?v=41',
  '/app.js?v=41',
  '/manifest.json',
  '/icon.png',
  '/icon-512.png',
  '/bg-chrome.jpg',
  '/bg-purple.jpg',
  '/bg-red.jpg'
];

// iOS WebKit strictly rejects cached responses with redirected === true during navigation.
// Rebuilding into a fresh Response strips the redirected flag safely.
async function stripRedirect(resp) {
  if (!resp) return resp;
  if (!resp.redirected && resp.status === 200) return resp;
  try {
    const body = await resp.arrayBuffer();
    const headers = new Headers(resp.headers);
    return new Response(body, {
      status: resp.status || 200,
      statusText: resp.statusText || 'OK',
      headers
    });
  } catch (e) {
    return resp;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(
        SHELL_ASSETS.map(async (u) => {
          const resp = await fetch(u, { cache: 'reload' });
          if (resp && resp.ok) {
            const clean = await stripRedirect(resp);
            await cache.put(u, clean);
          }
        })
      ))
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
    const timer = setTimeout(() => ctrl.abort(), 2800);
    const resp = await fetch(request, { signal: ctrl.signal });
    clearTimeout(timer);
    if (resp && resp.ok) {
      const clean = await stripRedirect(resp.clone());
      cache.put('/', clean.clone()).catch(() => {});
      return resp.redirected ? clean : resp;
    }
  } catch (e) {}

  const cached = (await cache.match('/')) || (await cache.match('/index.html')) || (await cache.match(request, { ignoreSearch: true }));
  if (cached) return await stripRedirect(cached);
  return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function cacheFirstAsset(request, cacheName, maxEntries = 0) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp && (resp.ok || resp.type === 'opaque')) {
      const toStore = resp.type === 'opaque' ? resp.clone() : await stripRedirect(resp.clone());
      cache.put(request, toStore).then(async () => {
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
    url.pathname.startsWith('/api/app/') ||
    url.pathname.startsWith('/api/playlists/') ||
    url.hostname.includes('lrclib.net') ||
    url.hostname.includes('telegram.org')
  ) {
    return;
  }

  // Page navigations -> network-first with instant non-redirected offline fallback
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
