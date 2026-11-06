import type { ApplicationStatus } from "@/generated/prisma/enums";
import {
  dateKeysBetween,
  formatDateKey,
  logicalDateKey,
  shiftDateKey,
  weekStartKey,
} from "@/lib/dates";

/**
 * Pure aggregations behind the analytics page. Everything works on logical-day keys
 * ("YYYY-MM-DD", see lib/dates) so "a day" always means the user's day.
 */

// ── Ranges & buckets ────────────────────────────────────────────────────────

export const RANGES = {
  "7d": { days: 7, label: "7 days" },
  "30d": { days: 30, label: "30 days" },
  "90d": { days: 90, label: "90 days" },
  "12m": { days: 365, label: "12 months" },
} as const;
export type RangeKey = keyof typeof RANGES;
export const DEFAULT_RANGE: RangeKey = "30d";

export function parseRange(value: unknown): RangeKey {
  return typeof value === "string" && value in RANGES ? (value as RangeKey) : DEFAULT_RANGE;
}

export type Bucket = "day" | "week" | "month";

/** Columns per chart stay readable: daily up to a month, weekly for a quarter, monthly for a year. */
export function bucketFor(range: RangeKey): Bucket {
  return range === "12m" ? "month" : range === "90d" ? "week" : "day";
}

export function bucketKey(key: string, bucket: Bucket): string {
  if (bucket === "day") return key;
  if (bucket === "week") return weekStartKey(key);
  return `${key.slice(0, 7)}-01`;
}

/** Ordered bucket keys covering `from..to` (the first one may start before `from`). */
export function bucketKeys(from: string, to: string, bucket: Bucket): string[] {
  const out: string[] = [];
  for (const k of dateKeysBetween(from, to)) {
    const b = bucketKey(k, bucket);
    if (out.at(-1) !== b) out.push(b);
  }
  return out;
}

export function bucketLabel(key: string, bucket: Bucket): string {
  if (bucket === "month") return formatDateKey(key, { day: undefined, month: "short" });
  return formatDateKey(key);
}

/** Sum per-day values into buckets (missing days count as 0). */
export function sumByBucket(
  perDay: Map<string, number>,
  keys: string[],
  bucket: Bucket,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const k of keys) {
    const b = bucketKey(k, bucket);
    out.set(b, (out.get(b) ?? 0) + (perDay.get(k) ?? 0));
  }
  return out;
}

/** Count instants per logical day. */
export function countByDay(
  instants: Date[],
  tz: string,
  dayStartHour: number,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const at of instants) {
    const k = logicalDateKey(at, tz, dayStartHour);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

// ── Sleep ───────────────────────────────────────────────────────────────────

/**
 * Sleep per night, keyed by the logical day you woke up on. Tracked sleep entries win;
 * a day with none falls back to the journal's bed/wake times. Running entries count to `now`.
 */
export function sleepByNight(
  entries: { startedAt: Date; endedAt: Date | null }[],
  logs: { dateKey: string; bedAt: Date | null; wakeAt: Date | null }[],
  tz: string,
  dayStartHour: number,
  now: Date,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) {
    const end = e.endedAt ?? now;
    const ms = end.getTime() - e.startedAt.getTime();
    if (ms <= 0) continue;
    const k = logicalDateKey(end, tz, dayStartHour);
    out.set(k, (out.get(k) ?? 0) + ms);
  }
  for (const l of logs) {
    if (out.has(l.dateKey) || !l.bedAt || !l.wakeAt || l.wakeAt <= l.bedAt) continue;
    out.set(l.dateKey, l.wakeAt.getTime() - l.bedAt.getTime());
  }
  return out;
}

/** Average of the values present in each bucket (nights with no data don't count as 0). */
export function averageByBucket(
  perDay: Map<string, number>,
  keys: string[],
  bucket: Bucket,
): Map<string, number | null> {
  const sums = new Map<string, { total: number; n: number }>();
  for (const k of keys) {
    const v = perDay.get(k);
    if (v === undefined) continue;
    const b = bucketKey(k, bucket);
    const s = sums.get(b) ?? { total: 0, n: 0 };
    sums.set(b, { total: s.total + v, n: s.n + 1 });
  }
  const out = new Map<string, number | null>();
  for (const b of bucketKeys(keys[0]!, keys.at(-1)!, bucket)) {
    const s = sums.get(b);
    out.set(b, s ? s.total / s.n : null);
  }
  return out;
}

// ── Focus ───────────────────────────────────────────────────────────────────

export type RatedEntry = { startedAt: Date; endedAt: Date | null; focusRating: number };

/**
 * Time-weighted focus rating per bucket (a 3h session at 4 outweighs a 10m one at 1), by the
 * logical day the session started. Buckets with no rated sessions are null.
 */
export function focusByBucket(
  entries: RatedEntry[],
  keys: string[],
  bucket: Bucket,
  tz: string,
  dayStartHour: number,
  now: Date,
): Map<string, number | null> {
  const inRange = new Set(keys);
  const acc = new Map<string, { weighted: number; ms: number }>();
  for (const e of entries) {
    const day = logicalDateKey(e.startedAt, tz, dayStartHour);
    if (!inRange.has(day)) continue;
    const ms = (e.endedAt ?? now).getTime() - e.startedAt.getTime();
    if (ms <= 0) continue;
    const b = bucketKey(day, bucket);
    const a = acc.get(b) ?? { weighted: 0, ms: 0 };
    acc.set(b, { weighted: a.weighted + e.focusRating * ms, ms: a.ms + ms });
  }
  const out = new Map<string, number | null>();
  for (const b of bucketKeys(keys[0]!, keys.at(-1)!, bucket)) {
    const a = acc.get(b);
    out.set(b, a ? a.weighted / a.ms : null);
  }
  return out;
}

/** Overall time-weighted focus for a set of entries, or null. */
export function averageFocus(entries: RatedEntry[], now: Date): number | null {
  let weighted = 0;
  let total = 0;
  for (const e of entries) {
    const ms = (e.endedAt ?? now).getTime() - e.startedAt.getTime();
    if (ms <= 0) continue;
    weighted += e.focusRating * ms;
    total += ms;
  }
  return total ? weighted / total : null;
}

// ── Application funnel ──────────────────────────────────────────────────────

export const FUNNEL_STAGES = ["APPLIED", "OA", "INTERVIEWING", "OFFER"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

/**
 * How many applications reached at least each stage. The furthest stage an application ever
 * hit (from its history or its current status) counts for every stage before it too, so one
 * that skipped the OA still counts as past it.
 */
export function funnel(apps: { status: ApplicationStatus; reached: ApplicationStatus[] }[]) {
  const counts: Record<FunnelStage, number> = { APPLIED: 0, OA: 0, INTERVIEWING: 0, OFFER: 0 };
  let rejected = 0;
  let withdrawn = 0;
  let open = 0;
  for (const a of apps) {
    const furthest = Math.max(
      ...[a.status, ...a.reached].map((s) => FUNNEL_STAGES.indexOf(s as FunnelStage)),
    );
    // Rejected/withdrawn straight from the wishlist was never sent.
    if (furthest < 0 && a.status === "WISHLIST") continue;
    for (let i = 0; i <= Math.max(0, furthest); i++) counts[FUNNEL_STAGES[i]!] += 1;
    if (a.status === "REJECTED") rejected += 1;
    if (a.status === "WITHDRAWN") withdrawn += 1;
    if (a.status === "APPLIED" || a.status === "OA" || a.status === "INTERVIEWING") open += 1;
  }
  return { counts, rejected, withdrawn, open };
}

// ── Heatmap ─────────────────────────────────────────────────────────────────

const HOUR = 3_600_000;
/** Upper bounds (exclusive) of study levels 1–3; level 4 is anything above. */
export const HEAT_THRESHOLDS_MS = [1 * HOUR, 2 * HOUR, 4 * HOUR] as const;

export function heatLevel(ms: number): 0 | 1 | 2 | 3 | 4 {
  if (ms <= 0) return 0;
  if (ms < HEAT_THRESHOLDS_MS[0]) return 1;
  if (ms < HEAT_THRESHOLDS_MS[1]) return 2;
  if (ms < HEAT_THRESHOLDS_MS[2]) return 3;
  return 4;
}

/**
 * GitHub-style grid: one column per week (Monday first), 7 rows. Days outside
 * `from..to` are null so the first and last columns can be partial.
 */
export function heatmapWeeks(
  from: string,
  to: string,
  studyByDay: Map<string, number>,
): ({ key: string; ms: number; level: 0 | 1 | 2 | 3 | 4 } | null)[][] {
  const weeks: ({ key: string; ms: number; level: 0 | 1 | 2 | 3 | 4 } | null)[][] = [];
  for (let start = weekStartKey(from); start <= to; start = shiftDateKey(start, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const key = shiftDateKey(start, i);
        if (key < from || key > to) return null;
        const ms = studyByDay.get(key) ?? 0;
        return { key, ms, level: heatLevel(ms) };
      }),
    );
  }
  return weeks;
}

// ── Goals ───────────────────────────────────────────────────────────────────

export type GoalPeriodKind = "DAY" | "WEEK" | "MONTH";
export type PeriodSpan = { start: string; end: string };

function periodStart(key: string, period: GoalPeriodKind): string {
  return period === "DAY" ? key : period === "WEEK" ? weekStartKey(key) : `${key.slice(0, 7)}-01`;
}

function periodEnd(start: string, period: GoalPeriodKind): string {
  if (period === "DAY") return start;
  if (period === "WEEK") return shiftDateKey(start, 6);
  const [y, m] = start.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return shiftDateKey(next, -1);
}

/** How many past periods the goal history shows. */
export const GOAL_HISTORY: Record<GoalPeriodKind, number> = { DAY: 14, WEEK: 8, MONTH: 6 };

/**
 * The goal's periods up to the one containing `today` (oldest first): at most `count`, none
 * starting before the period that contains `startsOn`, none after the one containing `endsOn`.
 */
export function goalPeriods(
  period: GoalPeriodKind,
  startsOn: string,
  endsOn: string | null,
  today: string,
  count = GOAL_HISTORY[period],
): PeriodSpan[] {
  const last = periodStart(endsOn && endsOn < today ? endsOn : today, period);
  const first = periodStart(startsOn, period);
  const out: PeriodSpan[] = [];
  let start = last;
  while (out.length < count && start >= first) {
    out.unshift({ start, end: periodEnd(start, period) });
    start = periodStart(shiftDateKey(start, -1), period);
  }
  return out;
}

export function sumBetween(perDay: Map<string, number>, span: PeriodSpan): number {
  let total = 0;
  for (const [k, v] of perDay) if (k >= span.start && k <= span.end) total += v;
  return total;
}
