// تخزين واجهة النظام للعمل السريع وتثبيته كتطبيق — البيانات نفسها دائماً من السحابة
var CACHE = 'amirat2-v1';
var SHELL = ['./', './index.html', './app.js', './config.js', './manifest.json', './icon-192.webp', './icon-512.webp'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // الشبكة أولاً (حتى يوصل أي تحديث فوراً)، والنسخة المخزنة احتياط بدون نت
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request); }));
});
