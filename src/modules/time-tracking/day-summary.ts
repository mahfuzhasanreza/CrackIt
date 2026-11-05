import type { ActivityCategory } from "@/generated/prisma/enums";

/**
 * Pure functions that turn raw time entries into what a "day" view needs.
 * Entries may cross day boundaries (e.g. sleep 23:00 → 07:00); they are clipped to the window,
 * so each day only counts its own share. A running entry counts up to `now`.
 */

export type Interval = { start: Date; end: Date };

export type SummaryEntry = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  category: ActivityCategory;
  isProductive: boolean;
  trackId: string | null;
};

export type Segment = Interval & { entryId: string; running: boolean };

export type DaySummary = {
  /** Portion of the window that has already happened: [start, min(end, now)]. */
  elapsedMs: number;
  trackedMs: number;
  untrackedMs: number;
  productiveMs: number;
  byCategory: Partial<Record<ActivityCategory, number>>;
  byTrack: Record<string, number>;
  gaps: Interval[];
};

const ms = (i: Interval) => i.end.getTime() - i.start.getTime();
const minDate = (a: Date, b: Date) => (a < b ? a : b);
const maxDate = (a: Date, b: Date) => (a > b ? a : b);

/** Clip entries to the window. Running entries end at `now`. Result is sorted by start. */
export function clipToWindow(entries: SummaryEntry[], window: Interval, now: Date): Segment[] {
  return entries
    .map((e) => {
      const running = e.endedAt === null;
      const start = maxDate(e.startedAt, window.start);
      const end = minDate(e.endedAt ?? now, window.end);
      return { entryId: e.id, start, end, running };
    })
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Untracked holes in the elapsed part of the window, ignoring holes shorter than `minGapMs`. */
export function findGaps(
  segments: Segment[],
  window: Interval,
  now: Date,
  minGapMs = 60_000,
): Interval[] {
  const horizon = minDate(window.end, now);
  const gaps: Interval[] = [];
  let cursor = window.start;
  for (const s of segments) {
    if (s.start > cursor) gaps.push({ start: cursor, end: minDate(s.start, horizon) });
    cursor = maxDate(cursor, s.end);
    if (cursor >= horizon) break;
  }
  if (cursor < horizon) gaps.push({ start: cursor, end: horizon });
  return gaps.filter((g) => ms(g) >= minGapMs);
}

export function summarizeDay(entries: SummaryEntry[], window: Interval, now: Date): DaySummary {
  const segments = clipToWindow(entries, window, now);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const horizon = minDate(window.end, now);
  const elapsedMs = Math.max(0, horizon.getTime() - window.start.getTime());

  const byCategory: DaySummary["byCategory"] = {};
  const byTrack: DaySummary["byTrack"] = {};
  let trackedMs = 0;
  let productiveMs = 0;
  for (const s of segments) {
    const e = byId.get(s.entryId)!;
    const d = ms(s);
    trackedMs += d;
    if (e.isProductive) productiveMs += d;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + d;
    if (e.trackId) byTrack[e.trackId] = (byTrack[e.trackId] ?? 0) + d;
  }

  return {
    elapsedMs,
    trackedMs,
    untrackedMs: Math.max(0, elapsedMs - trackedMs),
    productiveMs,
    byCategory,
    byTrack,
    gaps: findGaps(segments, window, now),
  };
}
