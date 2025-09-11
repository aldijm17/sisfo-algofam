const CACHE_NAME = "Sisfo-AlgoFam-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./admin/index.html",
  "./admin/add.html",
  "./admin/edit.html",
  "./admin/js/env.js",
  "./admin/js/firebase.js",
  "./admin/js/script.js",
  "./sisfolite.html",
  "./css/style.css",
  "./js/script.js",
  "./js/minimal-header-snimation.js",
  "./js/env.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
