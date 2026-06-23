/* BioPod service worker - light offline support for the Plant Care Portal
   and handling for reminder notification clicks. */
var CACHE = "biopod-portal-v1";
var ASSETS = [
  "portal.html",
  "assets/css/styles.css",
  "assets/js/main.js",
  "assets/js/portal.js",
  "assets/img/favicon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) { return hit || caches.match("portal.html"); });
    })
  );
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cls) {
      for (var i = 0; i < cls.length; i++) {
        if (cls[i].url.indexOf("portal.html") !== -1 && "focus" in cls[i]) return cls[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("portal.html");
    })
  );
});
