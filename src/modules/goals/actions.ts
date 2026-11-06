"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import { goalFormSchema, goalIdSchema } from "./validators";

export async function saveGoalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = goalFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveGoal(user.id, parsed.data),
    parsed.data.id ? "Goal saved" : "Goal added",
  );
}

export async function deleteGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = goalIdSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.deleteGoal(user.id, parsed.data.id), "Goal deleted");
}
