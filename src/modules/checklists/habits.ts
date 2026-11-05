import { shiftDateKey, weekStartKey } from "@/lib/dates";

export type HabitRecurrence = "DAILY" | "WEEKLY";

/** The period a logical day belongs to: the day itself, or the Monday of its week. */
export function periodKey(dateKey: string, recurrence: HabitRecurrence): string {
  return recurrence === "DAILY" ? dateKey : weekStartKey(dateKey);
}

const step = (recurrence: HabitRecurrence) => (recurrence === "DAILY" ? 1 : 7);

/** The last `count` periods up to and including today's, oldest first. */
export function recentPeriods(today: string, recurrence: HabitRecurrence, count: number): string[] {
  const current = periodKey(today, recurrence);
  return Array.from({ length: count }, (_, i) =>
    shiftDateKey(current, -(count - 1 - i) * step(recurrence)),
  );
}

/**
 * Streak of consecutive completed periods. The current period doesn't break the streak until
 * it's over (same rule as the study streak), so an unticked today counts back from yesterday.
 */
export function habitStreak(
  completed: Iterable<string>,
  today: string,
  recurrence: HabitRecurrence,
): { current: number; best: number } {
  const done = new Set(completed);
  const s = step(recurrence);

  let cursor = periodKey(today, recurrence);
  if (!done.has(cursor)) cursor = shiftDateKey(cursor, -s);
  let current = 0;
  while (done.has(cursor)) {
    current += 1;
    cursor = shiftDateKey(cursor, -s);
  }

  let best = 0;
  for (const key of done) {
    if (done.has(shiftDateKey(key, -s))) continue; // not the start of a run
    let run = 0;
    for (let k = key; done.has(k); k = shiftDateKey(k, s)) run += 1;
    best = Math.max(best, run);
  }
  return { current, best };
}

export type DueState = "overdue" | "today" | "upcoming";

export function dueState(dueOn: string | null, today: string): DueState | null {
  if (!dueOn) return null;
  if (dueOn < today) return "overdue";
  return dueOn === today ? "today" : "upcoming";
}
