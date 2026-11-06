/*
 * CrackIt service worker. Deliberately minimal: it never caches pages or API responses
 * (all data is per-user and must be fresh). It only serves a static offline page when a
 * navigation fails because the network is down, and handles taps on the phone's
 * "timer running" notification (shown by the page; see modules/time-tracking/notification.ts).
 */
const CACHE = "crackit-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((r) => r ?? Response.error()),
    ),
  );
});

// ── Timer notification ───────────────────────────────────────────────────────────────
const TIMER_TAG = "crackit-timer";

/** Focus an open CrackIt window on /timer, or open one. */
async function openTimer() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const win = windows[0];
  if (!win) return self.clients.openWindow("/timer");
  await win.focus();
  return win.navigate ? win.navigate("/timer") : undefined;
}

/** Ask open pages to refresh so the header and timer page show it stopped. */
async function tellPagesStopped() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.forEach((w) => w.postMessage({ type: "timer-stopped" }));
}

async function stopFromNotification(entryId) {
  try {
    const res = await fetch("/api/timer/stop", {
      method: "POST",
      credentials: "same-origin",
      redirect: "manual", // signed out → the proxy redirects; treat that as a failure
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
    // 409: that timer already stopped (or another one runs) — nothing to do but refresh.
    if (res.ok || res.status === 409) return tellPagesStopped();
  } catch {
    // Offline: fall through and open the app.
  }
  return openTimer();
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  if (n.tag !== TIMER_TAG) return;
  n.close();
  event.waitUntil(
    event.action === "stop" && n.data?.entryId ? stopFromNotification(n.data.entryId) : openTimer(),
  );
});
