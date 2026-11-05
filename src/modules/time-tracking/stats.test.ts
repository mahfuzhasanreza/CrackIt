import { describe, expect, it } from "vitest";

import type { SummaryEntry } from "./day-summary";
import { computeStreak, dailyTotals } from "./stats";

const H = 3_600_000;
const day = (key: string) => ({
  key,
  window: { start: new Date(`${key}T00:00:00Z`), end: new Date(`${key}T24:00:00Z`) },
});
const e = (
  id: string,
  start: string,
  end: string | null,
  extra: Partial<SummaryEntry> = {},
): SummaryEntry => ({
  id,
  startedAt: new Date(start),
  endedAt: end ? new Date(end) : null,
  category: "STUDY",
  isProductive: true,
  trackId: "swe",
  ...extra,
});

describe("dailyTotals", () => {
  it("splits entries across days and totals study, sleep and tracks", () => {
    const totals = dailyTotals(
      [
        e("sleep", "2026-11-04T22:00:00Z", "2026-11-05T06:00:00Z", {
          category: "SLEEP",
          isProductive: false,
          trackId: null,
        }),
        e("a", "2026-11-05T08:00:00Z", "2026-11-05T10:00:00Z"),
        e("b", "2026-11-05T11:00:00Z", "2026-11-05T12:00:00Z", { trackId: "lect" }),
        e("c", "2026-11-05T13:00:00Z", "2026-11-05T13:30:00Z", { trackId: null }),
      ],
      [day("2026-11-04"), day("2026-11-05")],
      new Date("2026-11-06T00:00:00Z"),
    );
    expect(totals[0]).toMatchObject({ key: "2026-11-04", sleepMs: 2 * H, studyMs: 0 });
    expect(totals[1]).toMatchObject({
      key: "2026-11-05",
      sleepMs: 6 * H,
      studyMs: 3.5 * H,
      byTrack: { swe: 2 * H, lect: 1 * H },
      studyWithoutTrackMs: 0.5 * H,
    });
  });
});

describe("computeStreak", () => {
  const days = (studyHours: number[]) =>
    studyHours.map((h, i) => ({ key: `d${i}`, studyMs: h * H }));

  it("counts consecutive qualifying days ending today", () => {
    expect(computeStreak(days([2, 0, 1, 1.5, 3]), H)).toEqual({ current: 3, best: 3 });
  });

  it("doesn't break the streak while today is still below the threshold", () => {
    expect(computeStreak(days([1, 1, 1, 0.2]), H)).toEqual({ current: 3, best: 3 });
  });

  it("is broken by a missed yesterday", () => {
    expect(computeStreak(days([1, 1, 1, 0, 0]), H)).toEqual({ current: 0, best: 3 });
  });

  it("tracks the best run separately", () => {
    expect(computeStreak(days([1, 1, 1, 1, 0, 1]), H)).toEqual({ current: 1, best: 4 });
  });

  it("handles no data", () => {
    expect(computeStreak([], H)).toEqual({ current: 0, best: 0 });
  });
});
