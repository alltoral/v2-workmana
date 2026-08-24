// Workmana — service worker
// Only caches the static app shell (HTML/CSS/JS/icons) so the interface can
// open offline. Firestore data still needs an internet connection to sync.

var CACHE_NAME = "workmana-shell-v2";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon.ico"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  // Never intercept Firebase/Firestore/Auth network calls — those must always
  // go live so data stays real-time.
  if(req.url.indexOf("googleapis.com") !== -1 || req.url.indexOf("firebaseio.com") !== -1 || req.url.indexOf("gstatic.com") !== -1){
    return;
  }
  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).then(function(res){
        if(req.method === "GET" && res && res.status === 200 && res.type === "basic"){
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        }
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
