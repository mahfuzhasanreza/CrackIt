import "server-only";

import {
  dateKeysBetween,
  dayWindow,
  logicalDateKey,
  shiftDateKey,
  weekStartKey,
} from "@/lib/dates";

import { listTrackOptions, type TrackOption } from "../tracks-topics/repository";
import { listEntrySpans } from "../time-tracking/repository";
import { type DayView, getDay } from "../time-tracking/service";
import { computeStreak, type DayTotals, dailyTotals } from "../time-tracking/stats";

/** A day counts toward the streak with at least this much study. */
export const STREAK_MIN_STUDY_MS = 60 * 60_000;
const LOOKBACK_DAYS = 365;

export type Dashboard = {
  todayKey: string;
  today: DayView;
  last7: DayTotals[];
  week: { startKey: string; studyMs: number; byTrack: Record<string, number> };
  tracks: TrackOption[];
  streak: { current: number; best: number; thresholdMs: number };
};

type DashboardUser = { id: string; timezone: string; dayStartHour: number };

export async function getDashboard(user: DashboardUser, now = new Date()): Promise<Dashboard> {
  const todayKey = logicalDateKey(now, user.timezone, user.dayStartHour);
  const days = dateKeysBetween(shiftDateKey(todayKey, -(LOOKBACK_DAYS - 1)), todayKey).map(
    (key) => ({ key, window: dayWindow(key, user.timezone, user.dayStartHour) }),
  );

  const [spans, tracks, today] = await Promise.all([
    listEntrySpans(user.id, days[0]!.window.start, days.at(-1)!.window.end),
    listTrackOptions(user.id),
    getDay(user, todayKey, now),
  ]);

  const totals = dailyTotals(spans, days, now);
  const startKey = weekStartKey(todayKey);
  const weekDays = totals.filter((t) => t.key >= startKey);
  const byTrack: Record<string, number> = {};
  for (const d of weekDays) {
    for (const [id, ms] of Object.entries(d.byTrack)) byTrack[id] = (byTrack[id] ?? 0) + ms;
  }

  return {
    todayKey,
    today,
    last7: totals.slice(-7),
    week: { startKey, studyMs: weekDays.reduce((a, d) => a + d.studyMs, 0), byTrack },
    tracks,
    streak: { ...computeStreak(totals, STREAK_MIN_STUDY_MS), thresholdMs: STREAK_MIN_STUDY_MS },
  };
}
