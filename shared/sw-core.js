/*
 * Life apps: what lets an app open with no signal.
 *
 * Each app has a tiny sw.js that names its files and loads this one:
 *
 *   self.SHELL_APP = "test";
 *   self.SHELL_VERSION = "1";
 *   self.SHELL_FILES = ["./", "./app.js", "../shared/hub.js", ...];
 *   importScripts("../shared/sw-core.js");
 *
 * The app's own files are kept on the device and served from there at once;
 * a fresh copy is fetched in the background for next time, always asking
 * GitHub rather than the browser's short-term copy. So after you publish a
 * change, it shows up the second time you open the app.
 * Requests to the hub are never touched: data always goes straight through.
 */
(function () {
  "use strict";

  var CACHE = "lifeapps-" + self.SHELL_APP + "-" + self.SHELL_VERSION;
  var PREFIX = "lifeapps-" + self.SHELL_APP + "-";

  self.addEventListener("install", function (event) {
    event.waitUntil(
      caches
        .open(CACHE)
        .then(function (cache) {
          /* "reload" skips the browser's own short-term copy, so a new
             version never stores files from before the update */
          return cache.addAll(
            self.SHELL_FILES.map(function (f) {
              return new Request(f, { cache: "reload" });
            })
          );
        })
        .then(function () {
          return self.skipWaiting();
        })
    );
  });

  self.addEventListener("activate", function (event) {
    event.waitUntil(
      caches
        .keys()
        .then(function (keys) {
          return Promise.all(
            keys
              .filter(function (k) {
                return k.indexOf(PREFIX) === 0 && k !== CACHE;
              })
              .map(function (k) {
                return caches.delete(k);
              })
          );
        })
        .then(function () {
          return self.clients.claim();
        })
    );
  });

  self.addEventListener("fetch", function (event) {
    var req = event.request;
    if (req.method !== "GET") return;
    if (new URL(req.url).origin !== self.location.origin) return;

    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(req, { ignoreSearch: true }).then(function (cached) {
          var fresh = fetch(req, { cache: "no-cache" })
            .then(function (res) {
              if (res && res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(function () {
              return cached;
            });
          if (cached) {
            event.waitUntil(fresh.catch(function () {}));
            return cached;
          }
          return fresh;
        });
      })
    );
  });
})();
