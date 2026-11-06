"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { RunningTimer } from "../notification";

import { syncTimerNotification, useTimerNotificationEnabled } from "./timer-notification-store";

/**
 * Keeps the phone notification in step with the running timer (rendered by the header on
 * every page). Also refreshes the page when the notification's Stop button ended the timer.
 */
export function TimerNotification({ running }: { running: RunningTimer | null }) {
  const enabled = useTimerNotificationEnabled();
  const router = useRouter();
  const key = running
    ? [running.id, running.name, running.track, running.topic, running.startedAt.getTime()].join(
        "|",
      )
    : "";

  useEffect(() => {
    syncTimerNotification(running, enabled).catch(() => {
      // Notifications are a convenience; never break the page over them.
    });
    // `key` captures everything the notification shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "timer-stopped") router.refresh();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
