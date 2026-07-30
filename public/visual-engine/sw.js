const CACHE = "mirava-public-shell-v1";
const PUBLIC_SHELL = ["/visual-engine", "/visual-engine/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // MIRAVA Studio never caches API calls, signed URLs, source images, results or prompts.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/storage/")) return;
  if (request.mode === "navigate" && url.pathname.startsWith("/visual-engine")) {
    event.respondWith(fetch(request).catch(() => caches.match("/visual-engine/offline")));
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : { title: "MIRAVA Studio", body: "Votre création est prête", url: "/visual-engine/studio" };
  event.waitUntil(self.registration.showNotification(payload.title || "MIRAVA Studio", {
    body: payload.body || "Votre création est prête",
    icon: "/visual-engine/icon.svg",
    badge: "/visual-engine/icon.svg",
    data: { url: payload.url || "/visual-engine/studio" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/visual-engine/studio"));
});
