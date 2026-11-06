import { describe, expect, it } from "vitest";

import { scoreTrend } from "./rules";

describe("scoreTrend", () => {
  it("averages the latest window against the one before, ignoring unscored ones", () => {
    const items = [
      ...[2, 3, 3, 2, 3].map((s, i) => ({ dateKey: `2026-10-0${i + 1}`, selfScore: s })),
      ...[4, 4, 5, 4, 4].map((s, i) => ({ dateKey: `2026-10-1${i + 1}`, selfScore: s })),
      { dateKey: "2026-10-30", selfScore: null },
    ];
    expect(scoreTrend(items)).toEqual({ recent: 4.2, previous: 2.6, count: 10 });
  });

  it("handles few items", () => {
    expect(scoreTrend([])).toEqual({ recent: null, previous: null, count: 0 });
    expect(scoreTrend([{ dateKey: "2026-10-01", selfScore: 3 }])).toEqual({
      recent: 3,
      previous: null,
      count: 1,
    });
  });
});
