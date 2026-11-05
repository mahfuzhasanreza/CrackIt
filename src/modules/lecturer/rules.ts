import type { PublicationStatus } from "@/generated/prisma/enums";

const SUBMITTED_OR_LATER: PublicationStatus[] = ["SUBMITTED", "ACCEPTED", "PUBLISHED", "REJECTED"];

export const isSubmitted = (status: PublicationStatus) => SUBMITTED_OR_LATER.includes(status);

/**
 * Submission date to store. Past "writing" a paper must have one (DB CHECK): use the date the
 * user entered, else keep the existing one, else today.
 */
export function submittedOnFor(
  status: PublicationStatus,
  entered: string | undefined,
  existing: string | null,
  today: string,
): string | null {
  if (!isSubmitted(status)) return entered ?? existing;
  return entered ?? existing ?? today;
}

/** Average self-score of the latest `window` scored demos vs the `window` before. */
export function scoreTrend(
  demos: { dateKey: string; selfScore: number | null }[],
  window = 5,
): { recent: number | null; previous: number | null; count: number } {
  const scores = demos
    .filter((d) => d.selfScore !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((d) => d.selfScore!);
  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
  return {
    recent: avg(scores.slice(0, window)),
    previous: avg(scores.slice(window, window * 2)),
    count: scores.length,
  };
}
