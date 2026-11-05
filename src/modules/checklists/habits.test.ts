import { describe, expect, it } from "vitest";

import { dueState, habitStreak, periodKey, recentPeriods } from "./habits";

describe("periods", () => {
  it("daily = the day, weekly = Monday of the week", () => {
    expect(periodKey("2026-11-05", "DAILY")).toBe("2026-11-05");
    expect(periodKey("2026-11-05", "WEEKLY")).toBe("2026-11-02"); // Thu → Mon
    expect(periodKey("2026-11-02", "WEEKLY")).toBe("2026-11-02");
  });

  it("lists recent periods oldest first", () => {
    expect(recentPeriods("2026-11-05", "DAILY", 3)).toEqual([
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
    expect(recentPeriods("2026-11-05", "WEEKLY", 2)).toEqual(["2026-10-26", "2026-11-02"]);
  });
});

describe("habitStreak", () => {
  it("counts today when done", () => {
    expect(habitStreak(["2026-11-03", "2026-11-04", "2026-11-05"], "2026-11-05", "DAILY")).toEqual({
      current: 3,
      best: 3,
    });
  });

  it("an unticked today doesn't break the streak yet", () => {
    expect(habitStreak(["2026-11-03", "2026-11-04"], "2026-11-05", "DAILY").current).toBe(2);
  });

  it("a missed yesterday does", () => {
    expect(habitStreak(["2026-11-02", "2026-11-03"], "2026-11-05", "DAILY").current).toBe(0);
  });

  it("tracks the best run separately", () => {
    const done = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-11-05"];
    expect(habitStreak(done, "2026-11-05", "DAILY")).toEqual({ current: 1, best: 4 });
    expect(habitStreak([], "2026-11-05", "DAILY")).toEqual({ current: 0, best: 0 });
  });

  it("works in weeks", () => {
    expect(habitStreak(["2026-10-19", "2026-10-26"], "2026-11-05", "WEEKLY")).toEqual({
      current: 2,
      best: 2,
    });
    expect(habitStreak(["2026-10-19"], "2026-11-05", "WEEKLY").current).toBe(0);
  });
});

describe("dueState", () => {
  it("classifies due dates", () => {
    expect(dueState("2026-11-04", "2026-11-05")).toBe("overdue");
    expect(dueState("2026-11-05", "2026-11-05")).toBe("today");
    expect(dueState("2026-11-09", "2026-11-05")).toBe("upcoming");
    expect(dueState(null, "2026-11-05")).toBeNull();
  });
});
