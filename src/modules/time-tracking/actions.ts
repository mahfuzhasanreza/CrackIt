"use server";

import { parseLocalDateTime } from "@/lib/dates";
import {
  formFields as fields,
  invalidState as invalid,
  toActionState as toState,
} from "@/lib/action-result";
import type { ActionState } from "@/lib/action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import { entryFormSchema, startTimerSchema, stopTimerSchema } from "./validators";

export async function startTimerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = startTimerSchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);
  return toState(await service.startTimer(user.id, parsed.data), "Timer started");
}

export async function stopTimerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = stopTimerSchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);
  return toState(await service.stopTimer(user.id, parsed.data), "Timer stopped");
}

/** Create (no `id`) or update (with `id`) a time entry from the entry dialog. */
export async function saveEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = entryFormSchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  const { startedAt: startRaw, endedAt: endRaw, ...rest } = parsed.data;
  const startedAt = parseLocalDateTime(startRaw, user.timezone);
  const endedAt = endRaw ? parseLocalDateTime(endRaw, user.timezone) : null;
  if (!startedAt || (endRaw && !endedAt)) {
    return invalid({
      ...(!startedAt && { startedAt: ["Invalid date"] }),
      ...(endRaw && !endedAt && { endedAt: ["Invalid date"] }),
    });
  }

  const input = { ...rest, startedAt, endedAt };
  const id = formData.get("id");
  const result =
    typeof id === "string" && id
      ? await service.updateTimeEntry(user.id, id, input)
      : await service.createManualEntry(user.id, input);
  return toState(result, id ? "Entry updated" : "Entry added");
}

export async function deleteEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return invalid({ id: ["Missing id"] });
  return toState(await service.deleteTimeEntry(user.id, id), "Entry deleted");
}
