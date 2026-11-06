import { describe, expect, it } from "vitest";

import {
  averageByBucket,
  averageFocus,
  bucketFor,
  bucketKeys,
  focusByBucket,
  funnel,
  goalPeriods,
  heatLevel,
  heatmapWeeks,
  parseRange,
  sleepByNight,
  sumBetween,
  sumByBucket,
} from "./compute";

const H = 3_600_000;
const tz = "Asia/Dhaka"; // UTC+6, no DST
const dayStart = 4;
const at = (iso: string) => new Date(iso);

describe("ranges and buckets", () => {
  it("parses ranges with a 30-day fallback and picks a bucket per range", () => {
    expect(parseRange("90d")).toBe("90d");
    expect(parseRange("bogus")).toBe("30d");
    expect(parseRange(undefined)).toBe("30d");
    expect([bucketFor("7d"), bucketFor("30d"), bucketFor("90d"), bucketFor("12m")]).toEqual([
      "day",
      "day",
      "week",
      "month",
    ]);
  });

  it("bucket keys start on Mondays / the 1st and cover the range", () => {
    expect(bucketKeys("2026-11-04", "2026-11-17", "week")).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
    ]);
    expect(bucketKeys("2026-10-30", "2026-12-02", "month")).toEqual([
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ]);
  });

  it("sums per-day values into buckets, missing days as 0", () => {
    const perDay = new Map([
      ["2026-11-02", 2],
      ["2026-11-08", 3],
      ["2026-11-09", 5],
    ]);
    const keys = ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"];
    expect([...sumByBucket(perDay, keys, "week")]).toEqual([
      ["2026-11-02", 3], // 11-02 is outside the keys
      ["2026-11-09", 5],
    ]);
  });
});

describe("sleep", () => {
  it("counts a night on the day you woke up; tracked sleep beats the journal", () => {
    const entries = [
      // 23:00 → 06:30 Dhaka, crossing the 04:00 day start: one night for 11-08.
      { startedAt: at("2026-11-07T17:00:00Z"), endedAt: at("2026-11-08T00:30:00Z") },
    ];
    const logs = [
      {
        dateKey: "2026-11-08",
        bedAt: at("2026-11-07T16:00:00Z"),
        wakeAt: at("2026-11-08T02:00:00Z"),
      },
      {
        dateKey: "2026-11-09",
        bedAt: at("2026-11-08T18:00:00Z"),
        wakeAt: at("2026-11-09T01:00:00Z"),
      },
      { dateKey: "2026-11-10", bedAt: null, wakeAt: at("2026-11-10T01:00:00Z") },
    ];
    const now = at("2026-11-10T06:00:00Z");
    expect([...sleepByNight(entries, logs, tz, dayStart, now)]).toEqual([
      ["2026-11-08", 7.5 * H],
      ["2026-11-09", 7 * H],
    ]);
  });

  it("averages only nights with data", () => {
    const perDay = new Map([
      ["2026-11-09", 6 * H],
      ["2026-11-10", 8 * H],
    ]);
    const keys = ["2026-11-09", "2026-11-10", "2026-11-11"];
    expect([...averageByBucket(perDay, keys, "day")]).toEqual([
      ["2026-11-09", 6 * H],
      ["2026-11-10", 8 * H],
      ["2026-11-11", null],
    ]);
    expect([...averageByBucket(perDay, keys, "week")]).toEqual([["2026-11-09", 7 * H]]);
  });
});

describe("focus", () => {
  it("weights by duration and buckets by the day a session started", () => {
    const now = at("2026-11-10T12:00:00Z");
    const entries = [
      {
        startedAt: at("2026-11-09T04:00:00Z"),
        endedAt: at("2026-11-09T07:00:00Z"),
        focusRating: 4,
      },
      {
        startedAt: at("2026-11-09T08:00:00Z"),
        endedAt: at("2026-11-09T09:00:00Z"),
        focusRating: 2,
      },
      // 02:00 Dhaka on 11-11 is still logical day 11-10.
      {
        startedAt: at("2026-11-10T20:00:00Z"),
        endedAt: at("2026-11-10T21:00:00Z"),
        focusRating: 5,
      },
    ];
    expect(averageFocus(entries.slice(0, 2), now)).toBe(3.5);
    const keys = ["2026-11-09", "2026-11-10"];
    expect([...focusByBucket(entries, keys, "day", tz, dayStart, now)]).toEqual([
      ["2026-11-09", 3.5],
      ["2026-11-10", 5],
    ]);
    expect(averageFocus([], now)).toBeNull();
  });
});

describe("funnel", () => {
  it("counts the furthest stage reached for every earlier stage too", () => {
    const f = funnel([
      { status: "APPLIED", reached: ["WISHLIST", "APPLIED"] },
      { status: "REJECTED", reached: ["APPLIED", "OA", "REJECTED"] },
      // Skipped the OA, straight to interviews, then an offer.
      { status: "OFFER", reached: ["APPLIED", "INTERVIEWING", "OFFER"] },
      { status: "WITHDRAWN", reached: ["APPLIED", "INTERVIEWING", "WITHDRAWN"] },
      // Never sent.
      { status: "WISHLIST", reached: ["WISHLIST"] },
    ]);
    expect(f.counts).toEqual({ APPLIED: 4, OA: 3, INTERVIEWING: 2, OFFER: 1 });
    expect(f).toMatchObject({ rejected: 1, withdrawn: 1, open: 1 });
  });
});

describe("heatmap", () => {
  it("bins study time into levels", () => {
    expect([0, 1, H - 1, H, 2 * H, 4 * H, 9 * H].map(heatLevel)).toEqual([0, 1, 1, 2, 3, 4, 4]);
  });

  it("lays days out in Monday-first weeks with partial ends", () => {
    // 2026-11-04 is a Wednesday, 2026-11-10 a Tuesday.
    const weeks = heatmapWeeks("2026-11-04", "2026-11-10", new Map([["2026-11-05", 3 * H]]));
    expect(weeks).toHaveLength(2);
    expect(weeks[0]!.slice(0, 2)).toEqual([null, null]);
    expect(weeks[0]![3]).toEqual({ key: "2026-11-05", ms: 3 * H, level: 3 });
    expect(weeks[1]!.filter(Boolean)).toHaveLength(2);
  });
});

describe("goal periods", () => {
  it("lists recent periods, clipped to the goal's start", () => {
    expect(goalPeriods("WEEK", "2026-10-28", null, "2026-11-11")).toEqual([
      { start: "2026-10-26", end: "2026-11-01" },
      { start: "2026-11-02", end: "2026-11-08" },
      { start: "2026-11-09", end: "2026-11-15" },
    ]);
    expect(goalPeriods("DAY", "2026-01-01", null, "2026-11-11", 3).map((p) => p.start)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ]);
  });

  it("months end on the right day, and an ended goal stops at its end", () => {
    expect(goalPeriods("MONTH", "2026-01-15", "2026-02-10", "2026-11-11")).toEqual([
      { start: "2026-01-01", end: "2026-01-31" },
      { start: "2026-02-01", end: "2026-02-28" },
    ]);
    expect(goalPeriods("MONTH", "2026-12-01", null, "2026-12-05")).toEqual([
      { start: "2026-12-01", end: "2026-12-31" },
    ]);
  });

  it("sums a period", () => {
    const perDay = new Map([
      ["2026-11-01", 5],
      ["2026-11-02", 1],
      ["2026-11-08", 2],
      ["2026-11-09", 7],
    ]);
    expect(sumBetween(perDay, { start: "2026-11-02", end: "2026-11-08" })).toBe(3);
  });
});
