import "server-only";

import { refresh } from "next/cache";

import type { ActionState } from "./action-state";
import type { Result } from "./result";

/**
 * Turn a service `Result` into the `ActionState` a form shows. On success the current page is
 * refreshed (nothing is cached yet). Pass no message for quiet actions (toggles, reordering).
 */
export function toActionState<T>(result: Result<T>, successMessage?: string): ActionState {
  const submittedAt = Date.now();
  if (result.ok) {
    refresh();
    return { status: "success", message: successMessage, submittedAt };
  }
  return {
    status: "error",
    message: result.error.message,
    fieldErrors: result.error.fieldErrors,
    submittedAt,
  };
}

/** Validation failure from Zod's `flatten().fieldErrors`. */
export function invalidState(fieldErrors: Record<string, string[] | undefined>): ActionState {
  return {
    status: "error",
    message: "Check the highlighted fields.",
    fieldErrors,
    submittedAt: Date.now(),
  };
}

export const formFields = (formData: FormData) => Object.fromEntries(formData.entries());
