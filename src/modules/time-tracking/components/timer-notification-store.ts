"use client";

import { useSyncExternalStore } from "react";

import {
  notificationSupport,
  OPEN_ACTION,
  type NotificationSupport,
  type RunningTimer,
  STOP_ACTION,
  TIMER_NOTIFICATION_KEY,
  TIMER_NOTIFICATION_TAG,
  timerNotification,
} from "../notification";

// ── This device's on/off setting (localStorage; it's a per-device choice) ─────────────────

const CHANGE = "crackit:timer-notification-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

function readEnabled() {
  try {
    return localStorage.getItem(TIMER_NOTIFICATION_KEY) === "on";
  } catch {
    return false;
  }
}

export function useTimerNotificationEnabled() {
  return useSyncExternalStore(subscribe, readEnabled, () => false);
}

export function setTimerNotificationEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(TIMER_NOTIFICATION_KEY, "on");
    else localStorage.removeItem(TIMER_NOTIFICATION_KEY);
  } catch {
    // Storage blocked: the switch just won't stick.
  }
  window.dispatchEvent(new Event(CHANGE));
}

const noop = () => () => {};

function readSupport(): NotificationSupport {
  return notificationSupport({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    serviceWorker: "serviceWorker" in navigator,
    notifications: "Notification" in window,
  });
}

/** `null` while rendering on the server. */
export function useNotificationSupport(): NotificationSupport | null {
  return useSyncExternalStore(noop, readSupport, () => null);
}

// ── Showing / clearing the notification ────────────────────────────────────────────────

// Not every browser's NotificationOptions type lists these yet (Android Chrome supports them).
type TimerNotificationOptions = NotificationOptions & {
  actions?: { action: string; title: string }[];
  timestamp?: number;
  renotify?: boolean;
};

/**
 * Make the phone's notification match the timer: shown (once per entry, silently) while one
 * runs and the device opted in; cleared otherwise. A no-op without a service worker (dev).
 */
export async function syncTimerNotification(running: RunningTimer | null, enabled: boolean) {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
  // Registered only in production builds; wait for it to be active (first visit).
  if (!(await navigator.serviceWorker.getRegistration())) return;
  const reg = await navigator.serviceWorker.ready;
  const shown = await reg.getNotifications({ tag: TIMER_NOTIFICATION_TAG });
  const wanted = running && enabled && Notification.permission === "granted";
  if (!wanted) {
    shown.forEach((n) => n.close());
    return;
  }
  const n = timerNotification(running);
  // Already showing exactly this: leave it alone (re-posting would buzz again on some phones).
  if (
    shown.some((s) => s.data?.entryId === n.entryId && s.title === n.title && s.body === n.body)
  ) {
    return;
  }
  const options: TimerNotificationOptions = {
    body: n.body,
    tag: n.tag,
    data: { entryId: n.entryId },
    timestamp: n.timestamp,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    silent: true,
    renotify: false,
    requireInteraction: true,
    actions: [
      { action: STOP_ACTION, title: "Stop" },
      { action: OPEN_ACTION, title: "Open" },
    ],
  };
  await reg.showNotification(n.title, options);
}
