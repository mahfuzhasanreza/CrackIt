import "server-only";

import type { ResourceStatus } from "@/generated/prisma/enums";
import { dateKeyToDb, dbDateToKey, logicalDateKey } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { findOwnedTrack } from "../tracks-topics/repository";

import * as repo from "./repository";
import {
  applyProgress,
  applyStatus,
  progressOf,
  resolveSave,
  type ResourceState,
  unitLabelFor,
} from "./rules";
import type { ProgressInput, ResourceFormInput, StatusInput } from "./validators";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

const todayKey = (user: UserCtx, now: Date) =>
  logicalDateKey(now, user.timezone, user.dayStartHour);
const keyOrNull = (d: Date | null) => (d ? dbDateToKey(d) : null);
const dbOrNull = (k: string | null) => (k ? dateKeyToDb(k) : null);
const notFound = () => err("NOT_FOUND", "Resource not found.");

const toState = (r: NonNullable<Awaited<ReturnType<typeof repo.findResource>>>): ResourceState => ({
  status: r.status,
  completedUnits: r.completedUnits,
  totalUnits: r.totalUnits,
  startedOn: keyOrNull(r.startedOn),
  finishedOn: keyOrNull(r.finishedOn),
});

const stateFields = (s: ResourceState) => ({
  status: s.status,
  completedUnits: s.completedUnits,
  totalUnits: s.totalUnits,
  startedOn: dbOrNull(s.startedOn),
  finishedOn: dbOrNull(s.finishedOn),
});

/** In progress first, then planned, done, dropped; most recently touched first within each. */
const STATUS_ORDER: ResourceStatus[] = ["IN_PROGRESS", "PLANNED", "DONE", "DROPPED"];

export async function getResourcesPage(user: UserCtx, now = new Date()) {
  const rows = await repo.listResources(user.id);
  const resources = rows
    .map((r) => ({
      ...r,
      startedOn: keyOrNull(r.startedOn),
      finishedOn: keyOrNull(r.finishedOn),
      unit: unitLabelFor(r.type, r.unitLabel),
      progress: progressOf(r),
    }))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const count = (s: ResourceStatus) => resources.filter((r) => r.status === s).length;
  return {
    today: todayKey(user, now),
    resources,
    counts: {
      IN_PROGRESS: count("IN_PROGRESS"),
      PLANNED: count("PLANNED"),
      DONE: count("DONE"),
      DROPPED: count("DROPPED"),
    },
  };
}

export type ResourcesPage = Awaited<ReturnType<typeof getResourcesPage>>;
export type ResourceView = ResourcesPage["resources"][number];

/** Create (no `id`) or edit a resource; status and dates follow `rules.ts`. */
export async function saveResource(
  user: UserCtx,
  input: ResourceFormInput,
  now = new Date(),
): Promise<Result<null>> {
  if (input.trackId && !(await findOwnedTrack(user.id, input.trackId))) {
    return err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
  }
  const existing = input.id ? await repo.findResource(user.id, input.id) : null;
  if (input.id && !existing) return notFound();

  const state = resolveSave(
    existing && toState(existing),
    {
      status: input.status,
      completedUnits: input.completedUnits,
      totalUnits: input.totalUnits ?? null,
    },
    todayKey(user, now),
  );
  const data = {
    title: input.title,
    author: input.author ?? null,
    type: input.type,
    url: input.url ?? null,
    trackId: input.trackId ?? null,
    unitLabel: input.unitLabel ?? null,
    // A rating is about a resource you've finished or dropped.
    rating: state.status === "DONE" || state.status === "DROPPED" ? (input.rating ?? null) : null,
    notesMd: input.notesMd,
    ...stateFields(state),
  };

  if (!existing) {
    await repo.createResource({ ...data, userId: user.id });
    return ok(null);
  }
  return (await repo.updateResource(user.id, existing.id, data)) ? ok(null) : notFound();
}

/** "+1" or "Log progress": returns the new status so the UI can celebrate a finish. */
export async function logProgress(
  user: UserCtx,
  input: ProgressInput,
  now = new Date(),
): Promise<Result<{ status: ResourceStatus }>> {
  const existing = await repo.findResource(user.id, input.id);
  if (!existing) return notFound();
  const completed = input.completed ?? existing.completedUnits + (input.step ?? 0);
  if (completed < 0) return err("VALIDATION", "Can't go below zero.");
  if (existing.totalUnits !== null && completed > existing.totalUnits) {
    return err("VALIDATION", `There are only ${existing.totalUnits}.`, {
      completed: [`At most ${existing.totalUnits}`],
    });
  }
  const state = applyProgress(toState(existing), completed, todayKey(user, now));
  return (await repo.updateResource(user.id, existing.id, stateFields(state)))
    ? ok({ status: state.status })
    : notFound();
}

/** Quick status change from a card's menu ("Mark as done", "Drop"). */
export async function setStatus(
  user: UserCtx,
  input: StatusInput,
  now = new Date(),
): Promise<Result<null>> {
  const existing = await repo.findResource(user.id, input.id);
  if (!existing) return notFound();
  const state = applyStatus(toState(existing), input.status, todayKey(user, now));
  return (await repo.updateResource(user.id, existing.id, stateFields(state)))
    ? ok(null)
    : notFound();
}

export async function deleteResource(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteResource(userId, id)) ? ok(null) : notFound();
}
