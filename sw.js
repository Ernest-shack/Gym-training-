// Offline support: precache the app shell.
const CACHE = 'gym-training-v2';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/charts.js',
  'js/storage.js',
  'js/training.js',
  'js/data/gear.js',
  'js/data/exercises.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'img/gear/01.jpg',
  'img/gear/02.jpg',
  'img/gear/03.jpg',
  'img/gear/04.jpg',
  'img/gear/05.jpg',
  'img/gear/06.jpg',
  'img/gear/07.jpg',
  'img/gear/08.jpg',
  'img/gear/09.jpg',
  'img/gear/10.jpg',
  'img/gear/11.jpg',
  'img/gear/12.jpg',
  'img/gear/13.jpg',
  'img/gear/14.jpg',
  'img/gear/15.jpg',
  'img/gear/16.jpg',
  'img/gear/17.jpg',
  'img/gear/18.jpg',
  'img/gear/19.jpg',
  'img/gear/20.svg',
  'img/gear/21.svg',
  'img/gear/22.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate: answer from cache instantly, refresh it in the background.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => hit);
      if (hit) e.waitUntil(fresh);
      return hit || fresh;
    }),
  );
});
