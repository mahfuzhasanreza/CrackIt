"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";
import { formatDateKey } from "@/lib/dates";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import {
  deleteSchema,
  presentationFormSchema,
  questionFormSchema,
  reviewSchema,
} from "./validators";

export async function savePresentationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = presentationFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.savePresentation(user, parsed.data),
    parsed.data.id ? "Presentation saved" : "Presentation logged",
  );
}

export async function saveQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = questionFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveQuestion(user, parsed.data),
    parsed.data.id ? "Question saved" : "Question added: first practice tomorrow",
  );
}

export async function reviewQuestionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const result = await service.reviewQuestion(user, parsed.data.id, parsed.data.outcome);
  const message =
    parsed.data.outcome === "forgot"
      ? "No worries, it's back tomorrow"
      : result.ok && !result.data.nextReviewOn
        ? "Mastered: no more practice scheduled"
        : `Next practice on ${result.ok && result.data.nextReviewOn ? formatDateKey(result.data.nextReviewOn) : ""}`;
  return toActionState(result, message);
}

const DELETED = { presentation: "Presentation", question: "Question" };

export async function deletePracticeRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.deleteRecord(user.id, parsed.data.kind, parsed.data.id),
    `${DELETED[parsed.data.kind]} deleted`,
  );
}
