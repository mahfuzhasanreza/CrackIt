import { describe, expect, it } from "vitest";

import { applyAttempt, applyManualStatus, applyReview, type ProblemState } from "./rules";

const NOW = new Date("2026-11-05T04:00:00Z");
const TODAY = "2026-11-05";
const fresh: ProblemState = {
  status: "TODO",
  attempts: 0,
  timeSpentMin: 0,
  solvedAt: null,
  nextReviewOn: null,
  reviewStage: 0,
};

describe("applyAttempt", () => {
  it("an unsolved first attempt moves TODO → ATTEMPTED and adds time", () => {
    expect(applyAttempt(fresh, { minutes: 25, solved: false }, TODAY, NOW)).toEqual({
      ...fresh,
      status: "ATTEMPTED",
      attempts: 1,
      timeSpentMin: 25,
    });
  });

  it("solving records the first solve and schedules a revision tomorrow", () => {
    const solved = applyAttempt(
      { ...fresh, status: "ATTEMPTED", attempts: 1, timeSpentMin: 25 },
      { minutes: 20, solved: true },
      TODAY,
      NOW,
    );
    expect(solved).toEqual({
      status: "SOLVED",
      attempts: 2,
      timeSpentMin: 45,
      solvedAt: NOW,
      nextReviewOn: "2026-11-06",
      reviewStage: 0,
    });
    // A later re-solve keeps the first solve time.
    const later = new Date("2026-11-20T04:00:00Z");
    expect(applyAttempt(solved, { minutes: 5, solved: true }, "2026-11-20", later).solvedAt).toBe(
      NOW,
    );
  });

  it("failing a problem you'd solved before means it needs revision", () => {
    const p = { ...fresh, status: "SOLVED" as const, solvedAt: NOW, nextReviewOn: "2026-11-09" };
    expect(applyAttempt(p, { minutes: 10, solved: false }, TODAY, NOW).status).toBe(
      "NEEDS_REVISION",
    );
  });
});

describe("applyReview", () => {
  const solved = { ...fresh, status: "SOLVED" as const, solvedAt: NOW, nextReviewOn: TODAY };

  it("remembered walks the schedule", () => {
    expect(applyReview(solved, "remembered", TODAY)).toMatchObject({
      status: "SOLVED",
      reviewStage: 1,
      nextReviewOn: "2026-11-08",
    });
  });

  it("forgot flags it and restarts tomorrow; remembering later clears the flag", () => {
    const forgot = applyReview({ ...solved, reviewStage: 3 }, "forgot", TODAY);
    expect(forgot).toMatchObject({
      status: "NEEDS_REVISION",
      reviewStage: 0,
      nextReviewOn: "2026-11-06",
    });
    expect(applyReview(forgot, "remembered", "2026-11-06").status).toBe("SOLVED");
  });
});

describe("applyManualStatus", () => {
  it("marking solved records the time and starts revisions", () => {
    expect(applyManualStatus(fresh, "SOLVED", true, TODAY, NOW)).toMatchObject({
      status: "SOLVED",
      solvedAt: NOW,
      nextReviewOn: "2026-11-06",
    });
  });

  it("keeps a pending schedule and clears it when unticked or unsolved", () => {
    const p = {
      ...fresh,
      status: "SOLVED" as const,
      solvedAt: NOW,
      nextReviewOn: "2026-11-09",
      reviewStage: 2,
    };
    expect(applyManualStatus(p, "SOLVED", true, TODAY, NOW)).toMatchObject({
      nextReviewOn: "2026-11-09",
      reviewStage: 2,
    });
    expect(applyManualStatus(p, "SOLVED", false, TODAY, NOW).nextReviewOn).toBeNull();
    expect(applyManualStatus(p, "ATTEMPTED", true, TODAY, NOW).nextReviewOn).toBeNull();
  });
});
