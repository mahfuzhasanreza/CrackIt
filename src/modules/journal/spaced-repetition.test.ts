import { describe, expect, it } from "vitest";

import { initialReview, isDue, nextReview, REVIEW_INTERVALS_DAYS } from "./spaced-repetition";

describe("spaced repetition", () => {
  it("first revision is the day after learning", () => {
    expect(initialReview("2026-11-05")).toEqual({ stage: 0, revisitOn: "2026-11-06" });
  });

  it("walks the 1/3/7/14/30-day schedule, counted from the review day", () => {
    expect(REVIEW_INTERVALS_DAYS).toEqual([1, 3, 7, 14, 30]);
    expect(nextReview(0, "remembered", "2026-11-06")).toEqual({
      stage: 1,
      revisitOn: "2026-11-09",
    });
    expect(nextReview(1, "remembered", "2026-11-09").revisitOn).toBe("2026-11-16");
    expect(nextReview(2, "remembered", "2026-11-16").revisitOn).toBe("2026-11-30");
    expect(nextReview(3, "remembered", "2026-11-30").revisitOn).toBe("2026-12-30");
  });

  it("finishes after the last step", () => {
    expect(nextReview(4, "remembered", "2026-12-30")).toEqual({ stage: 5, revisitOn: null });
  });

  it("forgetting restarts the schedule from tomorrow", () => {
    expect(nextReview(3, "forgot", "2026-11-30")).toEqual({ stage: 0, revisitOn: "2026-12-01" });
  });

  it("is due on or after the revisit day", () => {
    expect(isDue("2026-11-05", "2026-11-05")).toBe(true);
    expect(isDue("2026-11-01", "2026-11-05")).toBe(true);
    expect(isDue("2026-11-06", "2026-11-05")).toBe(false);
    expect(isDue(null, "2026-11-05")).toBe(false);
  });
});
