import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

const itemSelect = {
  id: true,
  title: true,
  sortOrder: true,
  dueOn: true,
  priority: true,
  doneAt: true,
  completions: { select: { period: true }, orderBy: { period: "asc" } },
} satisfies Prisma.ChecklistItemSelect;

const checklistSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  recurrence: true,
  createdAt: true,
  track: { select: { id: true, name: true, color: true } },
  items: { select: itemSelect, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.ChecklistSelect;

export type ChecklistRow = Prisma.ChecklistGetPayload<{ select: typeof checklistSelect }>;

/** Every list with items and (all) habit completions. Personal-scale data, so no paging. */
export function listChecklists(userId: string) {
  return db.checklist.findMany({
    where: { userId },
    select: checklistSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function findChecklist(userId: string, id: string) {
  return db.checklist.findFirst({
    where: { id, userId },
    select: { id: true, type: true, recurrence: true },
  });
}

export async function createChecklist(
  data: Omit<Prisma.ChecklistUncheckedCreateInput, "sortOrder">,
) {
  const sortOrder = await db.checklist.count({ where: { userId: data.userId } });
  return db.checklist.create({ data: { ...data, sortOrder }, select: { id: true } });
}

export async function updateChecklist(
  userId: string,
  id: string,
  data: { title: string; description: string | null; trackId: string | null },
) {
  const { count } = await db.checklist.updateMany({ where: { id, userId }, data });
  return count > 0;
}

export async function deleteChecklist(userId: string, id: string) {
  const { count } = await db.checklist.deleteMany({ where: { id, userId } });
  return count > 0;
}

// ── Items ───────────────────────────────────────────────────────────────────

export function findItem(userId: string, id: string) {
  return db.checklistItem.findFirst({
    where: { id, userId },
    select: {
      id: true,
      checklistId: true,
      checklist: { select: { type: true, recurrence: true } },
    },
  });
}

export async function createItem(data: {
  userId: string;
  checklistId: string;
  title: string;
  dueOn: Date | null;
  priority: number;
}) {
  const sortOrder = await db.checklistItem.count({ where: { checklistId: data.checklistId } });
  return db.checklistItem.create({ data: { ...data, sortOrder }, select: { id: true } });
}

export async function updateItem(
  userId: string,
  id: string,
  data: { title?: string; dueOn?: Date | null; priority?: number; doneAt?: Date | null },
) {
  const { count } = await db.checklistItem.updateMany({ where: { id, userId }, data });
  return count > 0;
}

export async function deleteItem(userId: string, id: string) {
  const { count } = await db.checklistItem.deleteMany({ where: { id, userId } });
  return count > 0;
}

export function listItemIds(userId: string, checklistId: string) {
  return db.checklistItem
    .findMany({
      where: { userId, checklistId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));
}

export function reorderItems(userId: string, orderedIds: string[]) {
  return db.$transaction(
    orderedIds.map((id, i) =>
      db.checklistItem.updateMany({ where: { id, userId }, data: { sortOrder: i } }),
    ),
  );
}

// ── Habit completions ───────────────────────────────────────────────────────

export function addCompletion(userId: string, itemId: string, period: Date) {
  return db.checklistItemCompletion.upsert({
    where: { itemId_period: { itemId, period } },
    create: { userId, itemId, period },
    update: {},
  });
}

export function removeCompletion(userId: string, itemId: string, period: Date) {
  return db.checklistItemCompletion.deleteMany({ where: { userId, itemId, period } });
}
