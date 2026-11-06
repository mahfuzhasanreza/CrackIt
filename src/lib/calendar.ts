import { shiftDateKey, weekStartKey } from "./dates";

/** "2026-11" → the month's first day key, or null if malformed. */
export function parseMonthKey(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return `${value}-01`;
}

export function shiftMonth(firstOfMonth: string, months: number): string {
  const [y, m] = firstOfMonth.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`;
}

/**
 * Monday-first weeks covering the month (5 or 6 rows); `inMonth` marks the month's own days.
 */
export function monthGrid(firstOfMonth: string): { key: string; inMonth: boolean }[][] {
  const month = firstOfMonth.slice(0, 7);
  const weeks: { key: string; inMonth: boolean }[][] = [];
  let day = weekStartKey(firstOfMonth);
  while (weeks.length === 0 || day.slice(0, 7) === month) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const key = shiftDateKey(day, i);
      return { key, inMonth: key.slice(0, 7) === month };
    });
    weeks.push(week);
    day = shiftDateKey(day, 7);
  }
  return weeks;
}
