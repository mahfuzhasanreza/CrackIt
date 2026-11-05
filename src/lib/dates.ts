import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";

/**
 * Time-zone aware helpers. All instants are stored/passed as UTC `Date`s; a user's "day" is
 * the interval [dayStartHour on that date, dayStartHour on the next date) in their IANA zone.
 * Day keys are "YYYY-MM-DD" strings naming the *logical* day.
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isValidDateKey(value: string): boolean {
  const m = DATE_KEY.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return (
    d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!
  );
}

function parseDateKey(key: string): [number, number, number] {
  if (!isValidDateKey(key)) throw new Error(`Invalid date key: ${key}`);
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return [y, m - 1, d];
}

/** Calendar date of `instant` in `tz` ("YYYY-MM-DD"). */
export function toDateKey(instant: Date, tz: string): string {
  return format(new TZDate(instant, tz), "yyyy-MM-dd");
}

/** The logical day `instant` belongs to: before dayStartHour it's still "yesterday". */
export function logicalDateKey(instant: Date, tz: string, dayStartHour: number): string {
  const local = new TZDate(instant, tz);
  const key = format(local, "yyyy-MM-dd");
  return local.getHours() < dayStartHour ? shiftDateKey(key, -1) : key;
}

export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = parseDateKey(key);
  return format(addDays(new Date(y, m, d), days), "yyyy-MM-dd");
}

/** UTC bounds of a logical day. May be 23h or 25h long on DST transitions. */
export function dayWindow(
  key: string,
  tz: string,
  dayStartHour: number,
): { start: Date; end: Date } {
  const [y, m, d] = parseDateKey(key);
  const start = new TZDate(y, m, d, dayStartHour, 0, 0, tz);
  const end = new TZDate(y, m, d + 1, dayStartHour, 0, 0, tz);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** Parse an <input type="datetime-local"> value as wall-clock time in `tz`. */
export function parseLocalDateTime(value: string, tz: string): Date | null {
  const m = LOCAL_DATE_TIME.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (!isValidDateKey(`${m[1]}-${m[2]}-${m[3]}`) || h > 23 || mi > 59) return null;
  return new Date(new TZDate(y, mo - 1, d, h, mi, 0, tz).getTime());
}

/** Format an instant for an <input type="datetime-local"> in `tz`. */
export function toLocalDateTimeInput(instant: Date, tz: string): string {
  return format(new TZDate(instant, tz), "yyyy-MM-dd'T'HH:mm");
}

export function formatTime(instant: Date, tz: string): string {
  return format(new TZDate(instant, tz), "HH:mm");
}

/** "2h 05m", "45m", "0m". Seconds are floored. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** "1:02:03" / "02:03" stopwatch format. */
export function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** Day of week of a date key: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(key: string): number {
  const [y, m, d] = parseDateKey(key);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
}

/** First day of the week containing `key`. Default week starts Monday (ISO). */
export function weekStartKey(key: string, weekStartsOn = 1): string {
  return shiftDateKey(key, -((dayOfWeek(key) - weekStartsOn + 7) % 7));
}

/** Inclusive list of date keys from `from` to `to`. */
export function dateKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let k = from; k <= to; k = shiftDateKey(k, 1)) keys.push(k);
  return keys;
}

/** Compact duration for tight chart labels: "45m", "2h", "5.5h". */
export function formatHoursCompact(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}
