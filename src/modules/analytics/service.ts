import "server-only";

import {
  dateKeyToDb,
  dateKeysBetween,
  dayWindow,
  dbDateToKey,
  logicalDateKey,
  shiftDateKey,
} from "@/lib/dates";

import { type GoalRow, listGoals } from "../goals/service";
import { listEntrySpans } from "../time-tracking/repository";
import { dailyTotals } from "../time-tracking/stats";

import {
  averageByBucket,
  averageFocus,
  bucketFor,
  bucketKeys,
  bucketLabel,
  countByDay,
  focusByBucket,
  funnel,
  goalPeriods,
  heatmapWeeks,
  RANGES,
  type RangeKey,
  sleepByNight,
  sumBetween,
  sumByBucket,
} from "./compute";
import * as repo from "./repository";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

const HEATMAP_DAYS = 365;
/** Longest goal history: 6 months. */
const GOAL_LOOKBACK_DAYS = 190;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);

export async function getAnalytics(user: UserCtx, range: RangeKey, now = new Date()) {
  const { timezone: tz, dayStartHour } = user;
  const today = logicalDateKey(now, tz, dayStartHour);
  const days = RANGES[range].days;
  const from = shiftDateKey(today, -(days - 1));
  const prevFrom = shiftDateKey(from, -days);
  const prevTo = shiftDateKey(from, -1);
  const bucket = bucketFor(range);

  // One pass over everything the page needs: this range, the previous one (for deltas),
  // the heatmap year and goal history.
  const first = [
    prevFrom,
    shiftDateKey(today, -(HEATMAP_DAYS - 1)),
    shiftDateKey(today, -GOAL_LOOKBACK_DAYS),
  ].sort()[0]!;
  const allKeys = dateKeysBetween(first, today);
  const windows = allKeys.map((key) => ({ key, window: dayWindow(key, tz, dayStartHour) }));
  const start = windows[0]!.window.start;
  const end = windows.at(-1)!.window.end;

  const [spans, tracks, rated, sleepLogs, solvedAt, learning, sent, prevSent, goals] =
    await Promise.all([
      listEntrySpans(user.id, start, end),
      repo.listAllTracks(user.id),
      repo.listRatedEntries(user.id, dayWindow(prevFrom, tz, dayStartHour).start, end),
      repo.listSleepLogs(user.id, dateKeyToDb(prevFrom), dateKeyToDb(today)),
      repo.listSolvedAt(user.id, start, end),
      repo.countLearningByDate(user.id, dateKeyToDb(first), dateKeyToDb(today)),
      repo.listSentApplications(user.id, dateKeyToDb(from), dateKeyToDb(today)),
      repo.listSentApplications(user.id, dateKeyToDb(prevFrom), dateKeyToDb(prevTo)),
      listGoals(user.id),
    ]);

  const totals = dailyTotals(spans, windows, now);
  const byKey = new Map(totals.map((t) => [t.key, t]));
  const studyByDay = new Map(totals.map((t) => [t.key, t.studyMs]));
  const keysIn = (a: string, b: string) => allKeys.filter((k) => k >= a && k <= b);
  const rangeKeys = keysIn(from, today);
  const prevKeys = keysIn(prevFrom, prevTo);

  // ── Study by track ──────────────────────────────────────────────────────
  const rangeTotals = rangeKeys.map((k) => byKey.get(k)!);
  const trackMs = new Map<string, number>();
  for (const d of rangeTotals) {
    for (const [id, ms] of Object.entries(d.byTrack)) trackMs.set(id, (trackMs.get(id) ?? 0) + ms);
  }
  const usedTracks = tracks.filter((t) => (trackMs.get(t.id) ?? 0) > 0);
  const noTrackMs = sum(rangeTotals.map((d) => d.studyWithoutTrackMs));
  const studyMs = sum(rangeTotals.map((d) => d.studyMs));
  const columns = bucketKeys(from, today, bucket).map((key) => ({
    key,
    label: bucketLabel(key, bucket),
    values: {} as Record<string, number>,
  }));
  const colByKey = new Map(columns.map((c) => [c.key, c]));
  for (const t of usedTracks) {
    const perDay = new Map(rangeKeys.map((k) => [k, byKey.get(k)!.byTrack[t.id] ?? 0]));
    for (const [b, v] of sumByBucket(perDay, rangeKeys, bucket)) colByKey.get(b)!.values[t.id] = v;
  }
  if (noTrackMs > 0) {
    const perDay = new Map(rangeKeys.map((k) => [k, byKey.get(k)!.studyWithoutTrackMs]));
    for (const [b, v] of sumByBucket(perDay, rangeKeys, bucket)) colByKey.get(b)!.values.none = v;
  }
  const trackTotal = sum([...trackMs.values()]) + noTrackMs;
  const split = [
    ...usedTracks.map((t) => ({ ...t, ms: trackMs.get(t.id)! })),
    ...(noTrackMs > 0 ? [{ id: "none", name: "No track", color: null, ms: noTrackMs }] : []),
  ]
    .sort((a, b) => b.ms - a.ms)
    .map((t) => ({ ...t, share: trackTotal ? t.ms / trackTotal : 0 }));

  // ── Sleep & focus ───────────────────────────────────────────────────────
  const sleepEntries = spans.filter((s) => s.category === "SLEEP");
  const nights = sleepByNight(
    sleepEntries,
    sleepLogs.map((l) => ({ dateKey: dbDateToKey(l.date), bedAt: l.bedAt, wakeAt: l.wakeAt })),
    tz,
    dayStartHour,
    now,
  );
  const nightsIn = (keys: string[]) => keys.flatMap((k) => (nights.has(k) ? [nights.get(k)!] : []));
  const sleepSeries = [...averageByBucket(nights, rangeKeys, bucket)].map(([key, value]) => ({
    key,
    label: bucketLabel(key, bucket),
    value,
  }));
  const ratedIn = (a: string, b: string) =>
    rated.filter((e) => {
      const k = logicalDateKey(e.startedAt, tz, dayStartHour);
      return k >= a && k <= b;
    });
  const focusSeries = [...focusByBucket(rated, rangeKeys, bucket, tz, dayStartHour, now)].map(
    ([key, value]) => ({ key, label: bucketLabel(key, bucket), value }),
  );

  // ── Problems & learning per day ─────────────────────────────────────────
  const solvedByDay = countByDay(solvedAt, tz, dayStartHour);
  const learningByDay = new Map(learning.map((l) => [dbDateToKey(l.date), l.count]));
  const problemSeries = [...sumByBucket(solvedByDay, rangeKeys, bucket)].map(([key, value]) => ({
    key,
    label: bucketLabel(key, bucket),
    value,
  }));
  const countIn = (m: Map<string, number>, keys: string[]) => sum(keys.map((k) => m.get(k) ?? 0));

  // ── Goals ───────────────────────────────────────────────────────────────
  const goalProgress = goals.map((g) =>
    goalWithHistory(g, today, byKey, solvedByDay, learningByDay),
  );

  // ── KPIs (this range vs the one before) ─────────────────────────────────
  const untracked = (keys: string[]) => mean(keys.map((k) => byKey.get(k)!.untrackedMs));
  const kpis = {
    study: { value: studyMs, prev: sum(prevKeys.map((k) => byKey.get(k)!.studyMs)) },
    studyPerDay: studyMs / days,
    sleep: { value: mean(nightsIn(rangeKeys)), prev: mean(nightsIn(prevKeys)) },
    nightsLogged: nightsIn(rangeKeys).length,
    untracked: { value: untracked(rangeKeys), prev: untracked(prevKeys) },
    focus: {
      value: averageFocus(ratedIn(from, today), now),
      prev: averageFocus(ratedIn(prevFrom, prevTo), now),
    },
    problems: { value: countIn(solvedByDay, rangeKeys), prev: countIn(solvedByDay, prevKeys) },
    applications: { value: sent.length, prev: prevSent.length },
  };

  const heatFrom = shiftDateKey(today, -(HEATMAP_DAYS - 1));
  const heatKeys = keysIn(heatFrom, today);
  return {
    range,
    bucket,
    from,
    today,
    kpis,
    study: {
      columns,
      series: [
        ...usedTracks.map((t) => ({ id: t.id, label: t.name, color: t.color })),
        ...(noTrackMs > 0 ? [{ id: "none", label: "No track", color: null }] : []),
      ],
    },
    split,
    heatmap: {
      weeks: heatmapWeeks(heatFrom, today, studyByDay),
      totalMs: sum(heatKeys.map((k) => studyByDay.get(k) ?? 0)),
      activeDays: heatKeys.filter((k) => (studyByDay.get(k) ?? 0) > 0).length,
    },
    sleep: sleepSeries,
    focus: focusSeries,
    problems: problemSeries,
    funnel: funnel(
      sent.map((a) => ({ status: a.status, reached: a.events.map((e) => e.toStatus) })),
    ),
    goals: goalProgress,
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;

function goalWithHistory(
  g: GoalRow,
  today: string,
  byKey: Map<string, { studyMs: number; byTrack: Record<string, number> }>,
  solvedByDay: Map<string, number>,
  learningByDay: Map<string, number>,
) {
  const perDay =
    g.metric === "STUDY_MINUTES"
      ? new Map(
          [...byKey].map(([k, d]) => [
            k,
            (g.track ? (d.byTrack[g.track.id] ?? 0) : d.studyMs) / 60_000,
          ]),
        )
      : g.metric === "PROBLEMS_SOLVED"
        ? solvedByDay
        : learningByDay;
  const periods = goalPeriods(g.period, g.startsOn, g.endsOn, today).map((p) => {
    const actual = sumBetween(perDay, p);
    return { ...p, actual, met: actual >= g.target, current: p.start <= today && today <= p.end };
  });
  const ended = g.endsOn !== null && g.endsOn < today;
  const upcoming = g.startsOn > today;
  return { ...g, periods, ended, upcoming };
}

export type GoalProgress = Analytics["goals"][number];
