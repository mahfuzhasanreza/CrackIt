import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { parseLocalDateTime, shiftDateKey } from "@/lib/dates";

const MAX_SLEEP_MS = 24 * 60 * 60 * 1000;

export type SleepTimes = { bedAt: Date | null; wakeAt: Date | null };

/**
 * Turn the journal's "went to bed" / "woke up" clock times (HH:MM, user's tz) into instants
 * for logical day `dateKey`:
 * - bed time is the night *before* the day: 12:00 or later → previous calendar date,
 *   earlier (e.g. 01:30) → the day's own date (after midnight);
 * - wake time is on the day's date, unless it's before `dayStartHour` (still the next night).
 */
export function resolveSleepTimes(
  dateKey: string,
  times: { bedTime?: string; wakeTime?: string },
  tz: string,
  dayStartHour: number,
): SleepTimes {
  const at = (key: string, time: string) => parseLocalDateTime(`${key}T${time}`, tz);
  const hour = (time: string) => Number(time.slice(0, 2));

  const bedAt = times.bedTime
    ? at(hour(times.bedTime) >= 12 ? shiftDateKey(dateKey, -1) : dateKey, times.bedTime)
    : null;
  const wakeAt = times.wakeTime
    ? at(hour(times.wakeTime) < dayStartHour ? shiftDateKey(dateKey, 1) : dateKey, times.wakeTime)
    : null;
  return { bedAt, wakeAt };
}

/** Problem with a bed/wake pair, or null when it's a plausible night. */
export function sleepError({ bedAt, wakeAt }: SleepTimes): string | null {
  if (!bedAt || !wakeAt) return null;
  if (wakeAt <= bedAt) return "Wake-up must be after bedtime.";
  if (wakeAt.getTime() - bedAt.getTime() > MAX_SLEEP_MS) return "That's more than 24 hours.";
  return null;
}

export function sleepDurationMs({ bedAt, wakeAt }: SleepTimes): number | null {
  return bedAt && wakeAt && wakeAt > bedAt ? wakeAt.getTime() - bedAt.getTime() : null;
}

/** An instant as "HH:MM" in `tz`, for <input type="time">. */
export function toTimeInput(instant: Date, tz: string): string {
  return format(new TZDate(instant, tz), "HH:mm");
}
