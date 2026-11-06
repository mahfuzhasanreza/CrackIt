"use client";

import { useEffect } from "react";

/** Registers /sw.js (offline fallback page only) in production builds. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not fatal: the app works without it, just without the offline page.
    });
  }, []);
  return null;
}
