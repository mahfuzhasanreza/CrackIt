"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import {
  courseFormSchema,
  deleteSchema,
  demoFormSchema,
  practiceSchema,
  publicationFormSchema,
  vivaFormSchema,
} from "./validators";

const saved = (id: unknown, what: string) => `${what} ${id ? "saved" : "added"}`;

export async function saveCourseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = courseFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveCourse(user.id, parsed.data),
    saved(parsed.data.id, "Course"),
  );
}

export async function saveDemoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = demoFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.saveDemo(user, parsed.data), saved(parsed.data.id, "Demo"));
}

export async function savePublicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = publicationFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.savePublication(user, parsed.data),
    saved(parsed.data.id, "Publication"),
  );
}

export async function saveVivaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = vivaFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveViva(user, parsed.data),
    parsed.data.id ? "Question saved" : "Question added: first practice tomorrow",
  );
}

export async function practiseVivaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = practiceSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const result = await service.practiseViva(user, parsed.data.id, parsed.data.outcome);
  const message =
    parsed.data.outcome === "forgot"
      ? "No worries, it's back tomorrow"
      : result.ok && !result.data.nextReviewOn
        ? "Mastered: no more practice scheduled"
        : `Next practice on ${result.ok ? result.data.nextReviewOn : ""}`;
  return toActionState(result, message);
}

const DELETED = { course: "Course", demo: "Demo", publication: "Publication", viva: "Question" };

export async function deleteLecturerRecordAction(
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
