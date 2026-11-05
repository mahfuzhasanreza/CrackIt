"use server";

import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import {
  createChecklistSchema,
  idSchema,
  itemFormSchema,
  moveItemSchema,
  toggleItemSchema,
  updateChecklistSchema,
} from "./validators";

export async function createChecklistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createChecklistSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.createChecklist(user.id, parsed.data), "Checklist created");
}

export async function updateChecklistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateChecklistSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.updateChecklist(user.id, parsed.data), "Checklist saved");
}

export async function deleteChecklistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.deleteChecklist(user.id, parsed.data.id), "Checklist deleted");
}

/** Add (no `id`) or edit (with `id`) an item. */
export async function saveItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = itemFormSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveItem(user.id, parsed.data),
    parsed.data.id ? "Item saved" : undefined,
  );
}

/** Quiet: ticking shouldn't toast. */
export async function toggleItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = toggleItemSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.toggleItem(user, parsed.data.id, parsed.data.done));
}

export async function moveItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = moveItemSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.moveItem(user.id, parsed.data.id, parsed.data.direction));
}

export async function deleteItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.deleteItem(user.id, parsed.data.id), "Item deleted");
}
