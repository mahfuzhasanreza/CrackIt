import "server-only";

import type { ChecklistType, Recurrence } from "@/generated/prisma/enums";
import { dateKeyToDb, dayWindow, dbDateToKey, logicalDateKey } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { findOwnedTrack } from "../tracks-topics/repository";

import {
  type DueState,
  dueState,
  type HabitRecurrence,
  habitStreak,
  periodKey,
  recentPeriods,
} from "./habits";
import * as repo from "./repository";
import type { CreateChecklistInput, ItemFormInput, UpdateChecklistInput } from "./validators";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

/** How many recent periods a habit shows as history dots. */
export const HABIT_HISTORY = 7;

// ── Views ───────────────────────────────────────────────────────────────────

export type ItemView = {
  id: string;
  title: string;
  priority: number;
  dueOn: string | null;
  due: DueState | null;
  /** Non-habit: ticked. Habit: ticked for the current period. */
  done: boolean;
  doneAt: Date | null;
  habit: {
    streak: { current: number; best: number };
    history: { period: string; done: boolean }[];
  } | null;
};

export type ChecklistView = {
  id: string;
  title: string;
  description: string | null;
  type: ChecklistType;
  recurrence: Recurrence;
  track: { id: string; name: string; color: string } | null;
  items: ItemView[];
  /** Items done (habits: done this period) out of all items. */
  progress: { done: number; total: number };
};

function toView(row: repo.ChecklistRow, today: string): ChecklistView {
  const recurrence = row.recurrence === "NONE" ? null : (row.recurrence as HabitRecurrence);
  const current = recurrence ? periodKey(today, recurrence) : null;
  const items = row.items.map((item): ItemView => {
    const dueOn = item.dueOn ? dbDateToKey(item.dueOn) : null;
    if (!recurrence) {
      return {
        id: item.id,
        title: item.title,
        priority: item.priority,
        dueOn,
        due: item.doneAt ? null : dueState(dueOn, today),
        done: item.doneAt !== null,
        doneAt: item.doneAt,
        habit: null,
      };
    }
    const periods = new Set(item.completions.map((c) => dbDateToKey(c.period)));
    return {
      id: item.id,
      title: item.title,
      priority: item.priority,
      dueOn: null,
      due: null,
      done: periods.has(current!),
      doneAt: null,
      habit: {
        streak: habitStreak(periods, today, recurrence),
        history: recentPeriods(today, recurrence, HABIT_HISTORY).map((period) => ({
          period,
          done: periods.has(period),
        })),
      },
    };
  });
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    recurrence: row.recurrence,
    track: row.track,
    items,
    progress: { done: items.filter((i) => i.done).length, total: items.length },
  };
}

const todayKey = (user: UserCtx, now: Date) =>
  logicalDateKey(now, user.timezone, user.dayStartHour);

export async function getChecklists(user: UserCtx, now = new Date()) {
  const today = todayKey(user, now);
  const rows = await repo.listChecklists(user.id);
  return { today, checklists: rows.map((r) => toView(r, today)) };
}

export type TodayItem = ItemView & {
  checklistId: string;
  checklistTitle: string;
  recurrence: Recurrence;
};

/**
 * The dashboard's "today" list: every habit (ticked or not), plus non-habit items that are due
 * today or overdue, or were ticked today (so ticking one doesn't make it vanish).
 */
export async function getTodayChecklist(user: UserCtx, now = new Date()) {
  const { today, checklists } = await getChecklists(user, now);
  const window = dayWindow(today, user.timezone, user.dayStartHour);
  const doneToday = (i: ItemView) => i.doneAt !== null && i.doneAt >= window.start;
  const tag = (c: ChecklistView) => (i: ItemView) => ({
    ...i,
    checklistId: c.id,
    checklistTitle: c.title,
    recurrence: c.recurrence,
  });

  const habits = checklists.filter((c) => c.type === "HABIT").flatMap((c) => c.items.map(tag(c)));
  const due = checklists
    .filter((c) => c.type !== "HABIT")
    .flatMap((c) =>
      c.items
        .filter((i) => (i.due === "today" || i.due === "overdue") && !i.done)
        .concat(c.items.filter(doneToday))
        .map(tag(c)),
    )
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.dueOn ?? "").localeCompare(b.dueOn ?? "") ||
        b.priority - a.priority,
    );
  return { today, habits, due };
}

// ── Checklists ──────────────────────────────────────────────────────────────

async function checkTrack(userId: string, trackId?: string): Promise<Result<string | null>> {
  if (!trackId) return ok(null);
  return (await findOwnedTrack(userId, trackId))
    ? ok(trackId)
    : err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
}

export async function createChecklist(
  userId: string,
  input: CreateChecklistInput,
): Promise<Result<{ id: string }>> {
  const track = await checkTrack(userId, input.trackId);
  if (!track.ok) return track;
  return ok(
    await repo.createChecklist({
      userId,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      recurrence: input.recurrence,
      trackId: track.data,
    }),
  );
}

export async function updateChecklist(
  userId: string,
  input: UpdateChecklistInput,
): Promise<Result<null>> {
  const track = await checkTrack(userId, input.trackId);
  if (!track.ok) return track;
  const updated = await repo.updateChecklist(userId, input.id, {
    title: input.title,
    description: input.description ?? null,
    trackId: track.data,
  });
  return updated ? ok(null) : err("NOT_FOUND", "Checklist not found.");
}

export async function deleteChecklist(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteChecklist(userId, id))
    ? ok(null)
    : err("NOT_FOUND", "Checklist not found.");
}

// ── Items ───────────────────────────────────────────────────────────────────

/** Add (no `id`) or edit (with `id`) an item. Habits have no due dates. */
export async function saveItem(userId: string, input: ItemFormInput): Promise<Result<null>> {
  const checklist = await repo.findChecklist(userId, input.checklistId);
  if (!checklist) return err("NOT_FOUND", "Checklist not found.");
  const dueOn = checklist.type === "HABIT" || !input.dueOn ? null : dateKeyToDb(input.dueOn);

  if (!input.id) {
    await repo.createItem({
      userId,
      checklistId: checklist.id,
      title: input.title,
      dueOn,
      priority: input.priority,
    });
    return ok(null);
  }
  const item = await repo.findItem(userId, input.id);
  if (!item || item.checklistId !== checklist.id) return err("NOT_FOUND", "Item not found.");
  await repo.updateItem(userId, item.id, { title: input.title, dueOn, priority: input.priority });
  return ok(null);
}

/** Tick or untick: a habit for the current period, anything else once. */
export async function toggleItem(
  user: UserCtx,
  id: string,
  done: boolean,
  now = new Date(),
): Promise<Result<null>> {
  const item = await repo.findItem(user.id, id);
  if (!item) return err("NOT_FOUND", "Item not found.");
  const { type, recurrence } = item.checklist;

  if (type === "HABIT" && recurrence !== "NONE") {
    const period = dateKeyToDb(periodKey(todayKey(user, now), recurrence));
    if (done) await repo.addCompletion(user.id, id, period);
    else await repo.removeCompletion(user.id, id, period);
  } else {
    await repo.updateItem(user.id, id, { doneAt: done ? now : null });
  }
  return ok(null);
}

export async function moveItem(
  userId: string,
  id: string,
  direction: "up" | "down",
): Promise<Result<null>> {
  const item = await repo.findItem(userId, id);
  if (!item) return err("NOT_FOUND", "Item not found.");
  const ids = await repo.listItemIds(userId, item.checklistId);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ids.length) return ok(null);
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await repo.reorderItems(userId, ids);
  return ok(null);
}

export async function deleteItem(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteItem(userId, id)) ? ok(null) : err("NOT_FOUND", "Item not found.");
}
