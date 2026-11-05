import { describe, expect, it } from "vitest";

import { scoreTrend, submittedOnFor } from "./rules";

describe("submittedOnFor", () => {
  it("is optional before submission", () => {
    expect(submittedOnFor("WRITING", undefined, null, "2026-11-05")).toBeNull();
  });

  it("defaults to today when submitted without a date, and keeps an existing one", () => {
    expect(submittedOnFor("SUBMITTED", undefined, null, "2026-11-05")).toBe("2026-11-05");
    expect(submittedOnFor("ACCEPTED", undefined, "2026-09-01", "2026-11-05")).toBe("2026-09-01");
    expect(submittedOnFor("PUBLISHED", "2026-08-15", "2026-09-01", "2026-11-05")).toBe(
      "2026-08-15",
    );
  });
});

describe("scoreTrend", () => {
  it("averages the latest window against the one before, ignoring unscored demos", () => {
    const demos = [
      ...[2, 3, 3, 2, 3].map((s, i) => ({ dateKey: `2026-10-0${i + 1}`, selfScore: s })),
      ...[4, 4, 5, 4, 4].map((s, i) => ({ dateKey: `2026-10-1${i + 1}`, selfScore: s })),
      { dateKey: "2026-10-30", selfScore: null },
    ];
    expect(scoreTrend(demos)).toEqual({ recent: 4.2, previous: 2.6, count: 10 });
  });

  it("handles few demos", () => {
    expect(scoreTrend([])).toEqual({ recent: null, previous: null, count: 0 });
    expect(scoreTrend([{ dateKey: "2026-10-01", selfScore: 3 }])).toEqual({
      recent: 3,
      previous: null,
      count: 1,
    });
  });
});
