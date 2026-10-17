// يخزّن واجهة النظام ومكتباته حتى يفتح ويشتغل حتى بدون نت (البيانات آخر نسخة محفوظة بالجهاز)
var CACHE = 'amirat2-v4';
var SHELL = ['./', './index.html', './app.js', './config.js', './manifest.json', './icon-192.webp', './icon-512.webp'];
var LIBS = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|cdn\.jsdelivr\.net\/npm\/xlsx@|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/)/;
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url, u = new URL(url);
  if (LIBS.test(url)) { // المكتبات: من المخزّن أولاً (ما تتغير)
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); return r; });
    }));
    return;
  }
  if (u.origin !== location.origin) return;
  // ملفات النظام: الشبكة أولاً (حتى يوصل أي تحديث فوراً)، والمخزّن احتياط بدون نت
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
