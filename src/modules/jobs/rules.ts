import type { ApplicationStatus, InterviewOutcome, InterviewRound } from "@/generated/prisma/enums";

/** Kanban columns, in pipeline order. */
export const PIPELINE: ApplicationStatus[] = [
  "WISHLIST",
  "APPLIED",
  "OA",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

export const isClosed = (s: ApplicationStatus) => s === "REJECTED" || s === "WITHDRAWN";

export type PipelineState = { status: ApplicationStatus; appliedOn: string | null };
export type Transition = PipelineState & {
  event: { from: ApplicationStatus; to: ApplicationStatus } | null;
};

/**
 * Move an application. Leaving the wishlist records the applied date (today unless one was
 * entered); moving to the same status is a no-op (no event).
 */
export function transition(
  current: PipelineState,
  to: ApplicationStatus,
  today: string,
): Transition {
  if (current.status === to) return { ...current, event: null };
  return {
    status: to,
    appliedOn: to === "WISHLIST" ? current.appliedOn : (current.appliedOn ?? today),
    event: { from: current.status, to },
  };
}

/**
 * Status an application should move to when an interview is added: an OA round moves an
 * early application to OA; any other round moves it to INTERVIEWING. Never moves backwards,
 * and never reopens an offer or a closed application.
 */
export function statusAfterInterview(
  status: ApplicationStatus,
  round: InterviewRound,
): ApplicationStatus {
  if (round === "OA") return status === "WISHLIST" || status === "APPLIED" ? "OA" : status;
  return status === "WISHLIST" || status === "APPLIED" || status === "OA" ? "INTERVIEWING" : status;
}

// ── Interviews ──────────────────────────────────────────────────────────────

/**
 * Passed / didn't pass only once the interview has started; it can be cancelled (or reset to
 * pending) any time. Returns the reason it isn't allowed, or null.
 */
export function outcomeError(
  outcome: InterviewOutcome,
  scheduledAt: Date,
  now: Date,
): string | null {
  if ((outcome === "PASSED" || outcome === "FAILED") && scheduledAt > now) {
    return "It hasn't happened yet — record the result after the interview.";
  }
  return null;
}

export type InterviewBucket = "upcoming" | "needsOutcome" | "past";

/** Upcoming = pending and ahead; needs an outcome = pending but over; past = decided or cancelled. */
export function interviewBucket(
  i: { outcome: InterviewOutcome; scheduledAt: Date },
  now: Date,
): InterviewBucket {
  if (i.outcome !== "PENDING") return "past";
  return i.scheduledAt >= now ? "upcoming" : "needsOutcome";
}

const DAY_MS = 86_400_000;

/** Headline numbers for the interviews page. */
export function interviewStats(
  interviews: { outcome: InterviewOutcome; scheduledAt: Date; selfRating: number | null }[],
  now: Date,
) {
  const weekAhead = new Date(now.getTime() + 7 * DAY_MS);
  const passed = interviews.filter((i) => i.outcome === "PASSED").length;
  const failed = interviews.filter((i) => i.outcome === "FAILED").length;
  const ratings = interviews.flatMap((i) => (i.selfRating ? [i.selfRating] : []));
  return {
    nextWeek: interviews.filter(
      (i) => i.outcome === "PENDING" && i.scheduledAt >= now && i.scheduledAt < weekAhead,
    ).length,
    done: passed + failed,
    passed,
    passRate: passed + failed ? passed / (passed + failed) : null,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
  };
}

/** "in 3 h", "in 2 days", "5 min ago", "3 days ago" (rounded, for list hints). */
export function relativeTime(at: Date, now: Date): string {
  const diff = at.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const unit =
    abs < 60 * 60_000
      ? `${Math.max(1, Math.round(abs / 60_000))} min`
      : abs < DAY_MS
        ? `${Math.round(abs / 3_600_000)} h`
        : `${Math.round(abs / DAY_MS)} ${Math.round(abs / DAY_MS) === 1 ? "day" : "days"}`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

/** A mock in the future is scheduled practice: it can't have a score yet. */
export function mockScoreError(dateKey: string, today: string, score: number | undefined) {
  return dateKey > today && score !== undefined ? "Score it after the mock." : null;
}
