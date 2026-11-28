const CACHE_NAME = 'roam-shell-v4';
const APP_ROUTES = new Set(['/', '/account', '/download', '/welcome']);
const PRECACHE_URLS = [
  new Request('/', {cache: 'reload'}),
  '/manifest.webmanifest',
  '/favicon.svg',
  '/fonts.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/fallback.svg',
];

function cacheResponse(event, key, network, isCacheable = (response) => response.ok) {
  event.waitUntil(network.then((response) => {
    if (!response || !isCacheable(response)) return;
    const copy = response.clone();
    return caches.open(CACHE_NAME).then((cache) => cache.put(key, copy));
  }).catch(() => undefined));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('roam-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    const network = fetch(request, {cache: 'no-cache'});
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    if (APP_ROUTES.has(pathname)) {
      cacheResponse(event, '/', network, (response) =>
        response.ok && response.headers.get('content-type')?.includes('text/html'));
    }
    event.respondWith(network.catch(() => caches.match('/').then((cached) => cached || Response.error())));
    return;
  }

  const isBuildAsset = url.pathname.startsWith('/assets/');
  if (isBuildAsset || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/icons/')) {
    const cached = caches.open(CACHE_NAME).then((cache) => cache.match(request)).catch(() => undefined);
    // Vite build filenames change with their contents, so cache hits need no network refresh.
    const network = cached.then((response) => isBuildAsset && response ? undefined : fetch(request));
    cacheResponse(event, request, network);
    event.respondWith(cached.then((response) => response || network));
  }
});
