import { shiftDateKey } from "@/lib/dates";

/**
 * Spaced repetition (PLAN rule 7), shared by learning notes and problems: revise +1, +3, +7, +14, +30 days apart. Each successful
 * review moves one step along; forgetting starts again from the first step. `stage` counts
 * successful reviews in a row; after the last step the entry is done (no revisit date).
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

export type ReviewOutcome = "remembered" | "forgot";
export type ReviewState = { stage: number; revisitOn: string | null };

/** First revision: the day after the entry was learned. */
export function initialReview(learnedOn: string): ReviewState {
  return { stage: 0, revisitOn: shiftDateKey(learnedOn, REVIEW_INTERVALS_DAYS[0]) };
}

export function nextReview(stage: number, outcome: ReviewOutcome, today: string): ReviewState {
  if (outcome === "forgot") return initialReview(today);
  const next = stage + 1;
  const interval = REVIEW_INTERVALS_DAYS[next];
  return { stage: next, revisitOn: interval === undefined ? null : shiftDateKey(today, interval) };
}

/** Is a scheduled entry due on `today`? Overdue entries count as due. */
export function isDue(revisitOn: string | null, today: string): boolean {
  return revisitOn !== null && revisitOn <= today;
}
