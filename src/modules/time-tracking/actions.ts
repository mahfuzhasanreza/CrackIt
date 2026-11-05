"use server";

import { refresh } from "next/cache";

import { parseLocalDateTime } from "@/lib/dates";
import type { Result } from "@/lib/result";

import type { ActionState } from "./action-state";

import { requireUser } from "../auth/dal";

import * as service from "./service";
import { entryFormSchema, startTimerSchema, stopTimerSchema } from "./validators";

function toState<T>(result: Result<T>, successMessage: string): ActionState {
  const submittedAt = Date.now();
  if (result.ok) {
    refresh();
    return { status: "success", message: successMessage, submittedAt };
  }
  return {
    status: "error",
    message: result.error.message,
    fieldErrors: result.error.fieldErrors,
    submittedAt,
  };
}

function invalid(fieldErrors: Record<string, string[] | undefined>): ActionState {
  return {
    status: "error",
    message: "Check the highlighted fields.",
    fieldErrors,
    submittedAt: Date.now(),
  };
}

const fields = (formData: FormData) => Object.fromEntries(formData.entries());

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
