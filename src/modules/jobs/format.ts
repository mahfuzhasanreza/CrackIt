import { formatDateKey, shiftDateKey } from "@/lib/dates";

/** Interview date/time labels. Server- and client-safe. */

export function formatWhen(d: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

export function formatTimeOfDay(d: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

/** "Today", "Tomorrow", "Yesterday" or "Mon, 9 Nov". */
export function dayHeading(dayKey: string, todayKey: string) {
  if (dayKey === todayKey) return "Today";
  if (dayKey === shiftDateKey(todayKey, 1)) return "Tomorrow";
  if (dayKey === shiftDateKey(todayKey, -1)) return "Yesterday";
  return formatDateKey(dayKey, {
    weekday: "short",
    year: dayKey.slice(0, 4) === todayKey.slice(0, 4) ? undefined : "numeric",
  });
}
