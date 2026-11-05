import { type Interval, type SummaryEntry, summarizeDay } from "./day-summary";

/** Per-day totals derived from entries clipped to each day's window. Pure. */
export type DayTotals = {
  key: string;
  studyMs: number;
  sleepMs: number;
  trackedMs: number;
  untrackedMs: number;
  /** Study (and any tracked) time per track id; `null` key = study without a track. */
  byTrack: Record<string, number>;
  studyWithoutTrackMs: number;
};

export function dailyTotals(
  entries: SummaryEntry[],
  days: { key: string; window: Interval }[],
  now: Date,
): DayTotals[] {
  const sorted = [...entries].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return days.map(({ key, window }) => {
    const inDay = sorted.filter(
      (e) => e.startedAt < window.end && (e.endedAt ?? now) > window.start,
    );
    const s = summarizeDay(inDay, window, now);
    const studyMs = s.byCategory.STUDY ?? 0;
    const trackStudy = Object.values(s.byTrack).reduce((a, b) => a + b, 0);
    return {
      key,
      studyMs,
      sleepMs: s.byCategory.SLEEP ?? 0,
      trackedMs: s.trackedMs,
      untrackedMs: s.untrackedMs,
      byTrack: s.byTrack,
      // Tracked time on a track can include non-study activities, so clamp at 0.
      studyWithoutTrackMs: Math.max(0, studyMs - trackStudy),
    };
  });
}

/**
 * Study streak: consecutive days with at least `thresholdMs` of study.
 * Today counts if it already qualifies; if not, the streak isn't broken yet (the day isn't
 * over), so counting starts from yesterday. `days` must be ascending and end with today.
 */
export function computeStreak(
  days: Pick<DayTotals, "key" | "studyMs">[],
  thresholdMs: number,
): { current: number; best: number } {
  const hit = days.map((d) => d.studyMs >= thresholdMs);

  let best = 0;
  let run = 0;
  for (const h of hit) {
    run = h ? run + 1 : 0;
    best = Math.max(best, run);
  }

  let i = hit.length - 1;
  if (i >= 0 && !hit[i]) i -= 1; // today in progress
  let current = 0;
  while (i >= 0 && hit[i]) {
    current += 1;
    i -= 1;
  }
  return { current, best };
}
