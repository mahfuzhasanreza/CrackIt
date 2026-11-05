import type { ProblemStatus } from "@/generated/prisma/enums";
import { initialReview, nextReview, type ReviewOutcome } from "@/lib/spaced-repetition";

/** The parts of a problem the rules read and change. Dates are day keys. */
export type ProblemState = {
  status: ProblemStatus;
  attempts: number;
  timeSpentMin: number;
  solvedAt: Date | null;
  nextReviewOn: string | null;
  reviewStage: number;
};

const SOLVED_STATES: ProblemStatus[] = ["SOLVED", "NEEDS_REVISION"];

/**
 * A logged attempt adds time and an attempt.
 * - Solved: status SOLVED, first-solve time kept, revision schedule (re)starts tomorrow.
 * - Not solved: TODO/ATTEMPTED → ATTEMPTED; a problem you'd solved before → NEEDS_REVISION.
 */
export function applyAttempt(
  p: ProblemState,
  attempt: { minutes: number; solved: boolean },
  today: string,
  now: Date,
): ProblemState {
  const base = {
    ...p,
    attempts: p.attempts + 1,
    timeSpentMin: p.timeSpentMin + attempt.minutes,
  };
  if (attempt.solved) {
    const review = initialReview(today);
    return {
      ...base,
      status: "SOLVED",
      solvedAt: p.solvedAt ?? now,
      nextReviewOn: review.revisitOn,
      reviewStage: review.stage,
    };
  }
  return { ...base, status: SOLVED_STATES.includes(p.status) ? "NEEDS_REVISION" : "ATTEMPTED" };
}

/** Revising a solved problem: remembered → next step (and back to SOLVED); forgot → NEEDS_REVISION, restart. */
export function applyReview(p: ProblemState, outcome: ReviewOutcome, today: string): ProblemState {
  const next = nextReview(p.reviewStage, outcome, today);
  return {
    ...p,
    status: outcome === "remembered" ? "SOLVED" : "NEEDS_REVISION",
    nextReviewOn: next.revisitOn,
    reviewStage: next.stage,
  };
}

/**
 * Status set directly in the form. Marking solved records when (DB CHECK requires it) and,
 * with `schedule`, starts revisions if none are pending; going back to TODO/ATTEMPTED or
 * unticking `schedule` clears them.
 */
export function applyManualStatus(
  p: ProblemState,
  status: ProblemStatus,
  schedule: boolean,
  today: string,
  now: Date,
): ProblemState {
  const solved = SOLVED_STATES.includes(status);
  if (!solved || !schedule) {
    return {
      ...p,
      status,
      solvedAt: solved ? (p.solvedAt ?? now) : p.solvedAt,
      nextReviewOn: null,
    };
  }
  if (p.nextReviewOn) return { ...p, status, solvedAt: p.solvedAt ?? now };
  const review = initialReview(today);
  return {
    ...p,
    status,
    solvedAt: p.solvedAt ?? now,
    nextReviewOn: review.revisitOn,
    reviewStage: review.stage,
  };
}
