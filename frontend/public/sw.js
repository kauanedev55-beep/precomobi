/* Intentionally no offline app shell, API, authentication or price caching. */
const CACHE = "precomobi-offline-v1";
const OFFLINE = "/offline.html";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    OFFLINE, "/icons/precomobi-192.png"
  ])));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("precomobi-offline-") && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate" ||
      new URL(request.url).origin !== self.location.origin ||
      new URL(request.url).pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request, { cache: "no-store" }).catch(async () => {
    const offline = await caches.match(OFFLINE);
    return offline || new Response("Sem conexão. Conecte-se à internet e tente novamente.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }));
});
