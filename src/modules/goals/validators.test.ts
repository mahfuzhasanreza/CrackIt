import { describe, expect, it } from "vitest";

import { formatGoalActual, goalTitle } from "./labels";
import { goalFormSchema } from "./validators";

const trackId = "0196f0c4-1a2b-7c3d-8e4f-123456789abc";
const base = { period: "WEEK", startsOn: "2026-11-01" };

describe("goal validators", () => {
  it("stores study hours as minutes and keeps the track only for study", () => {
    expect(
      goalFormSchema.parse({ ...base, metric: "STUDY_MINUTES", target: "1.5", trackId }),
    ).toMatchObject({
      target: 90,
      trackId,
    });
    expect(
      goalFormSchema.parse({ ...base, metric: "PROBLEMS_SOLVED", target: "3", trackId }).trackId,
    ).toBeUndefined();
  });

  it("rejects fractional counts, impossible hours and an end before the start", () => {
    expect(
      goalFormSchema.safeParse({ ...base, metric: "PROBLEMS_SOLVED", target: "2.5" }).success,
    ).toBe(false);
    expect(
      goalFormSchema.safeParse({ ...base, metric: "STUDY_MINUTES", target: "800" }).success,
    ).toBe(false);
    expect(
      goalFormSchema.safeParse({ ...base, metric: "STUDY_MINUTES", target: "0" }).success,
    ).toBe(false);
    expect(
      goalFormSchema.safeParse({
        ...base,
        metric: "STUDY_MINUTES",
        target: "2",
        endsOn: "2026-10-01",
      }).success,
    ).toBe(false);
  });

  it("titles goals in plain words", () => {
    expect(
      goalTitle({ metric: "STUDY_MINUTES", period: "WEEK", target: 600, track: { name: "SWE" } }),
    ).toBe("10h of SWE study a week");
    expect(goalTitle({ metric: "STUDY_MINUTES", period: "DAY", target: 90, track: null })).toBe(
      "1h 30m of study a day",
    );
    expect(goalTitle({ metric: "PROBLEMS_SOLVED", period: "DAY", target: 1, track: null })).toBe(
      "1 problem a day",
    );
    expect(goalTitle({ metric: "LEARNING_ENTRIES", period: "MONTH", target: 8, track: null })).toBe(
      "8 learning notes a month",
    );
    expect(formatGoalActual("PROBLEMS_SOLVED", 0)).toBe("0");
    expect(formatGoalActual("STUDY_MINUTES", 401)).toBe("6h 41m");
  });
});
