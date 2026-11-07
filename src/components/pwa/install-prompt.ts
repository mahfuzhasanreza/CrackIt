"use client";

import { useSyncExternalStore } from "react";

/**
 * Chromium's install prompt (`beforeinstallprompt`), kept so an "Install app" button can show
 * it later. Browsers that can't install (Safari, Firefox desktop) never fire the event, and
 * nor does Chrome when the app is already installed — so "we have an event" is exactly
 * "installing is possible here". An inline script in the root layout (`EARLY_CAPTURE`) catches
 * the event if it fires before this module loads (`install-capture.ts`).
 */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

type InstallWindow = Window & { __crackitInstallPrompt?: InstallPromptEvent | null };

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  deferred = (window as InstallWindow).__crackitInstallPrompt ?? null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of the browser's mini-infobar
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

/** Already running as the installed app (Android/desktop standalone window, iOS home screen). */
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function canOfferInstall(state: {
  hasPrompt: boolean;
  installed: boolean;
  standalone: boolean;
}) {
  return state.hasPrompt && !state.installed && !state.standalone;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () =>
  canOfferInstall({ hasPrompt: deferred !== null, installed, standalone: isStandalone() });

/** True only when this browser can install CrackIt and it isn't installed. */
export function useCanInstall() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

/** Show the browser's install dialog. Each prompt event can be used once. */
export async function promptInstall() {
  const event = deferred;
  if (!event) return "unavailable" as const;
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") installed = true;
  emit();
  return outcome;
}
