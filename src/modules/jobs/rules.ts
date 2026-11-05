import type { ApplicationStatus, InterviewRound } from "@/generated/prisma/enums";

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
