"use server";

import {
  formFields as fields,
  invalidState as invalid,
  toActionState as toState,
} from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import { dailyLogFormSchema, learningEntryFormSchema, reviewSchema } from "./validators";

export async function saveDailyLogAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = dailyLogFormSchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);
  return toState(await service.saveDailyLog(user, parsed.data), "Journal saved");
}

/** Create (no `id`) or update (with `id`) a learning entry. */
export async function saveLearningEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = learningEntryFormSchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);
  const id = formData.get("id");
  const result =
    typeof id === "string" && id
      ? await service.updateLearningEntry(user, id, parsed.data)
      : await service.createLearningEntry(user, parsed.data);
  return toState(result, id ? "Entry updated" : "Entry added");
}

export async function deleteLearningEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return invalid({ id: ["Missing id"] });
  return toState(await service.deleteLearningEntry(user.id, id), "Entry deleted");
}

export async function reviewLearningEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);
  const result = await service.reviewLearningEntry(user, parsed.data.id, parsed.data.outcome);
  const message =
    parsed.data.outcome === "forgot"
      ? "No worries, it's back for tomorrow"
      : result.ok && !result.data.revisitOn
        ? "Mastered: no more revisions scheduled"
        : `Next revision on ${result.ok ? result.data.revisitOn : ""}`;
  return toState(result, message);
}
