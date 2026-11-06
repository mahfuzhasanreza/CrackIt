import "server-only";

import { dateKeyToDb, dbDateToKey } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { findOwnedTrack } from "../tracks-topics/repository";

import * as repo from "./repository";
import type { GoalFormInput } from "./validators";

export async function listGoals(userId: string) {
  const rows = await repo.listGoals(userId);
  return rows.map((g) => ({
    ...g,
    startsOn: dbDateToKey(g.startsOn),
    endsOn: g.endsOn ? dbDateToKey(g.endsOn) : null,
  }));
}

export type GoalRow = Awaited<ReturnType<typeof listGoals>>[number];

/** Create (no `id`) or edit a goal. */
export async function saveGoal(userId: string, input: GoalFormInput): Promise<Result<null>> {
  if (input.trackId && !(await findOwnedTrack(userId, input.trackId))) {
    return err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
  }
  const data = {
    metric: input.metric,
    period: input.period,
    target: input.target,
    trackId: input.trackId ?? null,
    startsOn: dateKeyToDb(input.startsOn),
    endsOn: input.endsOn ? dateKeyToDb(input.endsOn) : null,
  };
  if (!input.id) {
    await repo.createGoal({ ...data, userId });
    return ok(null);
  }
  return (await repo.updateGoal(userId, input.id, data))
    ? ok(null)
    : err("NOT_FOUND", "Goal not found.");
}

export async function deleteGoal(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteGoal(userId, id)) ? ok(null) : err("NOT_FOUND", "Goal not found.");
}
