/**
 * The phone notification shown while a timer runs (opt-in per device). Plain module: used by
 * the client glue and unit-tested; the service worker (public/sw.js) relies on the same tag,
 * action ids and `data.entryId`.
 */
export const TIMER_NOTIFICATION_TAG = "crackit-timer";
/** localStorage key: "on" when this device wants the notification. */
export const TIMER_NOTIFICATION_KEY = "crackit:timer-notification";
export const STOP_ACTION = "stop";
export const OPEN_ACTION = "open";

export type RunningTimer = {
  id: string;
  name: string;
  track: string | null;
  topic: string | null;
  startedAt: Date;
};

/** What the notification says. Times are shown in the phone's own time zone. */
export function timerNotification(running: RunningTimer, timeZone?: string) {
  const started = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(running.startedAt);
  const what = [running.track, running.topic].filter(Boolean).join(" › ");
  return {
    title: `Timer running: ${running.name}`,
    body: what ? `${what}\nStarted ${started}` : `Started ${started}`,
    tag: TIMER_NOTIFICATION_TAG,
    entryId: running.id,
    timestamp: running.startedAt.getTime(),
  };
}

/**
 * Whether this device can (and should) offer the notification. Phones and tablets only
 * (coarse pointer). iOS exposes notifications only to apps added to the Home Screen.
 */
export type NotificationSupport = "supported" | "needs-install" | "unsupported";

export function notificationSupport(env: {
  coarsePointer: boolean;
  serviceWorker: boolean;
  notifications: boolean;
}): NotificationSupport {
  if (!env.coarsePointer || !env.serviceWorker) return "unsupported";
  return env.notifications ? "supported" : "needs-install";
}
