"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import { STATUS_LABEL } from "./labels";
import * as service from "./service";
import { progressSchema, resourceFormSchema, resourceIdSchema, statusSchema } from "./validators";

export async function saveResourceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = resourceFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveResource(user, parsed.data),
    parsed.data.id ? "Resource saved" : "Resource added",
  );
}

export async function logProgressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = progressSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const result = await service.logProgress(user, parsed.data);
  // Quiet for "+1"; a finish (or an explicit log) gets a toast.
  const message =
    result.ok && result.data.status === "DONE"
      ? "Finished — nice work!"
      : parsed.data.completed !== undefined
        ? "Progress saved"
        : undefined;
  return toActionState(result, message);
}

export async function setResourceStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.setStatus(user, parsed.data),
    `Marked as ${STATUS_LABEL[parsed.data.status].toLowerCase()}`,
  );
}

export async function deleteResourceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = resourceIdSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.deleteResource(user.id, parsed.data.id), "Resource deleted");
}
