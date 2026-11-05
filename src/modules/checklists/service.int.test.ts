import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import {
  createChecklist,
  deleteChecklist,
  deleteItem,
  getChecklists,
  getTodayChecklist,
  moveItem,
  saveItem,
  toggleItem,
  updateChecklist,
} from "./service";
import { createChecklistSchema } from "./validators";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
let user: { id: string; timezone: string; dayStartHour: number };

/** 10:00 Dhaka on the given logical day. */
const on = (key: string) => new Date(`${key}T04:00:00Z`);
const TODAY = "2026-11-05"; // a Thursday

beforeEach(async () => {
  ctx = await createTestUser();
  user = { id: ctx.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
});

async function newList(raw: Record<string, string>) {
  const res = await createChecklist(user.id, createChecklistSchema.parse(raw));
  if (!res.ok) throw new Error(res.error.message);
  return res.data.id;
}

async function addItem(
  checklistId: string,
  title: string,
  extra: { dueOn?: string; priority?: number } = {},
) {
  const res = await saveItem(user.id, { checklistId, title, priority: 0, ...extra });
  if (!res.ok) throw new Error(res.error.message);
  const { checklists } = await getChecklists(user, on(TODAY));
  return checklists.find((c) => c.id === checklistId)!.items.find((i) => i.title === title)!.id;
}

const list = async (id: string, now = on(TODAY)) =>
  (await getChecklists(user, now)).checklists.find((c) => c.id === id)!;

describe("one-off and roadmap lists", () => {
  it("adds items in order, ticks them and tracks progress", async () => {
    const id = await newList({ title: "Before applying", type: "ONE_OFF" });
    const cv = await addItem(id, "Update CV", { dueOn: "2026-11-04", priority: 2 });
    await addItem(id, "Write cover letter");

    let view = await list(id);
    expect(view.recurrence).toBe("NONE");
    expect(view.items.map((i) => [i.title, i.due])).toEqual([
      ["Update CV", "overdue"],
      ["Write cover letter", null],
    ]);

    await toggleItem(user, cv, true, on(TODAY));
    view = await list(id);
    expect(view.progress).toEqual({ done: 1, total: 2 });
    expect(view.items[0]).toMatchObject({ done: true, due: null });

    await toggleItem(user, cv, false, on(TODAY));
    expect((await list(id)).progress.done).toBe(0);
  });

  it("edits, reorders and deletes items", async () => {
    const id = await newList({ title: "Roadmap", type: "ROADMAP" });
    const a = await addItem(id, "A");
    await addItem(id, "B");
    await saveItem(user.id, { checklistId: id, id: a, title: "A1", priority: 1 });
    await moveItem(user.id, a, "down");
    expect((await list(id)).items.map((i) => i.title)).toEqual(["B", "A1"]);
    await deleteItem(user.id, a);
    expect((await list(id)).items.map((i) => i.title)).toEqual(["B"]);
  });
});

describe("habits", () => {
  it("defaults to daily, ticks per day and computes the streak", async () => {
    const id = await newList({ title: "Daily", type: "HABIT" });
    const item = await addItem(id, "1 LeetCode problem", { dueOn: "2026-11-09" });

    for (const day of ["2026-11-03", "2026-11-04"]) await toggleItem(user, item, true, on(day));
    let view = await list(id);
    expect(view.recurrence).toBe("DAILY");
    expect(view.items[0]).toMatchObject({ done: false, dueOn: null }); // habits have no due date
    expect(view.items[0]!.habit?.streak).toEqual({ current: 2, best: 2 });
    expect(view.items[0]!.habit?.history.slice(-3)).toEqual([
      { period: "2026-11-03", done: true },
      { period: "2026-11-04", done: true },
      { period: "2026-11-05", done: false },
    ]);

    await toggleItem(user, item, true, on(TODAY));
    view = await list(id);
    expect(view.items[0]).toMatchObject({ done: true });
    expect(view.items[0]!.habit?.streak.current).toBe(3);

    // Ticking twice is idempotent; unticking only affects today.
    await toggleItem(user, item, true, on(TODAY));
    await toggleItem(user, item, false, on(TODAY));
    expect((await list(id)).items[0]!.habit?.streak.current).toBe(2);
  });

  it("weekly habits tick per week", async () => {
    const id = await newList({ title: "Weekly", type: "HABIT", recurrence: "WEEKLY" });
    const item = await addItem(id, "Mock interview");
    await toggleItem(user, item, true, on("2026-11-03")); // Tuesday
    const view = await list(id); // Thursday of the same week
    expect(view.items[0]!.done).toBe(true);
    expect(await db.checklistItemCompletion.count({ where: { itemId: item } })).toBe(1);
  });

  it("the database requires recurrence exactly for habits", async () => {
    await expect(
      db.checklist.create({
        data: { userId: user.id, title: "x", type: "ONE_OFF", recurrence: "DAILY" },
      }),
    ).rejects.toThrow();
    await expect(
      db.checklist.create({ data: { userId: user.id, title: "x", type: "HABIT" } }),
    ).rejects.toThrow();
  });
});

describe("today checklist", () => {
  it("shows habits plus due, overdue and ticked-today items", async () => {
    const habits = await newList({ title: "Daily", type: "HABIT" });
    await addItem(habits, "Read 20 pages");
    const todo = await newList({ title: "To do", type: "ONE_OFF" });
    await addItem(todo, "Overdue", { dueOn: "2026-11-01" });
    await addItem(todo, "Due today", { dueOn: TODAY });
    await addItem(todo, "Later", { dueOn: "2026-11-20" });
    const noDate = await addItem(todo, "No date");
    await toggleItem(user, noDate, true, on(TODAY));

    const t = await getTodayChecklist(user, on(TODAY));
    expect(t.habits.map((h) => h.title)).toEqual(["Read 20 pages"]);
    expect(t.due.map((i) => [i.title, i.done])).toEqual([
      ["Overdue", false],
      ["Due today", false],
      ["No date", true],
    ]);
  });
});

describe("ownership", () => {
  it("other users can't touch a list or its items", async () => {
    const id = await newList({ title: "Mine", type: "ONE_OFF" });
    const item = await addItem(id, "Secret");
    const other = await createTestUser();
    const otherUser = { id: other.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };

    expect((await toggleItem(otherUser, item, true)).ok).toBe(false);
    expect((await saveItem(other.user.id, { checklistId: id, title: "x", priority: 0 })).ok).toBe(
      false,
    );
    expect((await updateChecklist(other.user.id, { id, title: "x" })).ok).toBe(false);
    expect((await deleteChecklist(other.user.id, id)).ok).toBe(false);
    expect((await getChecklists(otherUser)).checklists).toEqual([]);
    expect(
      (
        await createChecklist(other.user.id, {
          title: "x",
          type: "ROADMAP",
          recurrence: "NONE",
          trackId: ctx.track("SWE / Full-Stack").id,
        })
      ).ok,
    ).toBe(false);
  });

  it("deleting a list deletes its items and completions", async () => {
    const id = await newList({ title: "Daily", type: "HABIT" });
    const item = await addItem(id, "Walk");
    await toggleItem(user, item, true, on(TODAY));
    expect((await deleteChecklist(user.id, id)).ok).toBe(true);
    expect(await db.checklistItem.count({ where: { id: item } })).toBe(0);
    expect(await db.checklistItemCompletion.count({ where: { itemId: item } })).toBe(0);
  });
});
