"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import { attemptSchema, idSchema, problemFormSchema, reviewSchema } from "./validators";

/** Create (no `id`) or edit a problem. */
export async function saveProblemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = problemFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveProblem(user, parsed.data),
    parsed.data.id ? "Problem saved" : "Problem added",
  );
}

export async function logAttemptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = attemptSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const { id, ...attempt } = parsed.data;
  return toActionState(
    await service.logAttempt(user, id, attempt),
    attempt.solved ? "Solved! First revision is tomorrow" : "Attempt logged",
  );
}

export async function reviewProblemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const result = await service.reviewProblem(user, parsed.data.id, parsed.data.outcome);
  const message =
    parsed.data.outcome === "forgot"
      ? "Marked for revision. It's back tomorrow"
      : result.ok && !result.data.nextReviewOn
        ? "Mastered: no more revisions scheduled"
        : `Next revision on ${result.ok ? result.data.nextReviewOn : ""}`;
  return toActionState(result, message);
}

export async function deleteProblemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.deleteProblem(user.id, parsed.data.id), "Problem deleted");
}
