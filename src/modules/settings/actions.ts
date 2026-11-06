"use server";

import { signOut } from "@/auth";
import { formFields, invalidState, toActionState } from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import {
  activityTypeSchema,
  idSchema,
  moveSchema,
  passwordChangeSchema,
  profileSchema,
  trackSchema,
} from "./validators";

export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.saveProfile(user.id, parsed.data), "Settings saved");
}

/** On success every session ends, this one included: sign out and log in with the new one. */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordChangeSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  const result = await service.changePassword(user.id, parsed.data);
  if (!result.ok) return toActionState(result);
  await signOut({ redirectTo: "/login?password=changed" });
  return toActionState(result);
}

export async function saveTrackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = trackSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveTrack(user.id, parsed.data),
    parsed.data.id ? "Track saved" : "Track added",
  );
}

export async function deleteTrackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(await service.deleteTrack(user.id, parsed.data.id), "Track deleted");
}

export async function moveTrackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = moveSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.moveRow("track", user.id, parsed.data.id, parsed.data.direction),
  );
}

export async function saveActivityTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = activityTypeSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.saveActivityType(user.id, parsed.data),
    parsed.data.id ? "Activity saved" : "Activity added",
  );
}

export async function deleteActivityTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.deleteActivityType(user.id, parsed.data.id),
    "Activity deleted",
  );
}

export async function moveActivityTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = moveSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalidState(parsed.error.flatten().fieldErrors);
  return toActionState(
    await service.moveRow("activityType", user.id, parsed.data.id, parsed.data.direction),
  );
}
