"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import { projectFormSchema, projectIdSchema } from "./validators";

export async function saveProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = projectFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveProject(user.id, parsed.data),
    parsed.data.id ? "Project saved" : "Project added",
  );
}

export async function deleteProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = projectIdSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.deleteProject(user.id, parsed.data.id), "Project deleted");
}
