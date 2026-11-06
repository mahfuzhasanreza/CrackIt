import type { ResourceStatus, ResourceType } from "@/generated/prisma/enums";

export const RESOURCE_TYPES = ["BOOK", "COURSE", "VIDEO", "ARTICLE", "SHEET", "OTHER"] as const;
export const RESOURCE_STATUSES = ["PLANNED", "IN_PROGRESS", "DONE", "DROPPED"] as const;

const DEFAULT_UNIT: Record<ResourceType, string> = {
  BOOK: "chapters",
  COURSE: "lessons",
  VIDEO: "videos",
  ARTICLE: "parts",
  SHEET: "problems",
  OTHER: "units",
};

export const unitLabelFor = (type: ResourceType, label: string | null | undefined) =>
  label?.trim() || DEFAULT_UNIT[type];

/** Fraction done (0–1), or null when the resource has no total. DONE is always 1. */
export function progressOf(r: {
  status: ResourceStatus;
  completedUnits: number;
  totalUnits: number | null;
}): number | null {
  if (r.status === "DONE") return 1;
  if (!r.totalUnits) return null;
  return Math.min(1, r.completedUnits / r.totalUnits);
}

/** Lifecycle fields the rules own. Dates are `YYYY-MM-DD` keys. */
export type ResourceState = {
  status: ResourceStatus;
  completedUnits: number;
  totalUnits: number | null;
  startedOn: string | null;
  finishedOn: string | null;
};

/**
 * Set the status by hand. Leaving PLANNED records `startedOn` (DB CHECK); DONE records
 * `finishedOn` and fills the progress; anything else clears `finishedOn`. Back to PLANNED
 * forgets the start date.
 */
export function applyStatus(
  s: ResourceState,
  status: ResourceStatus,
  today: string,
): ResourceState {
  if (status === "PLANNED") return { ...s, status, startedOn: null, finishedOn: null };
  const startedOn = s.startedOn ?? today;
  if (status === "DONE") {
    return {
      ...s,
      status,
      startedOn,
      finishedOn: s.finishedOn ?? today,
      completedUnits: s.totalUnits ?? s.completedUnits,
    };
  }
  return { ...s, status, startedOn, finishedOn: null };
}

/**
 * Log progress (absolute count, already validated to be within `0..totalUnits`).
 * Any progress starts a planned or dropped resource; reaching the total finishes it;
 * going back below the total re-opens a finished one.
 */
export function applyProgress(s: ResourceState, completed: number, today: string): ResourceState {
  const next = { ...s, completedUnits: completed };
  if (s.totalUnits && completed >= s.totalUnits) return applyStatus(next, "DONE", today);
  if (s.status === "DONE" && s.totalUnits) return applyStatus(next, "IN_PROGRESS", today);
  if ((s.status === "PLANNED" || s.status === "DROPPED") && completed > s.completedUnits) {
    return applyStatus(next, "IN_PROGRESS", today);
  }
  return next;
}

/**
 * Resolve a form save. A status the user changed wins (DONE fills the progress); otherwise the
 * entered progress drives the status like `applyProgress`. A new resource starts from PLANNED.
 */
export function resolveSave(
  existing: ResourceState | null,
  input: { status: ResourceStatus; completedUnits: number; totalUnits: number | null },
  today: string,
): ResourceState {
  const base: ResourceState = {
    status: existing?.status ?? "PLANNED",
    completedUnits: existing?.completedUnits ?? 0,
    totalUnits: input.totalUnits,
    startedOn: existing?.startedOn ?? null,
    finishedOn: existing?.finishedOn ?? null,
  };
  if (input.status !== base.status) {
    const moved = applyStatus(
      { ...base, completedUnits: input.completedUnits },
      input.status,
      today,
    );
    // A brand-new resource saved as "in progress" with everything done is simply done.
    return moved.status === "IN_PROGRESS" &&
      moved.totalUnits &&
      moved.completedUnits >= moved.totalUnits
      ? applyStatus(moved, "DONE", today)
      : moved;
  }
  return applyProgress(base, input.completedUnits, today);
}
