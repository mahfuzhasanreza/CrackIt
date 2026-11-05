import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// ── Daily logs ──────────────────────────────────────────────────────────────

export function findDailyLog(userId: string, date: Date) {
  return db.dailyLog.findUnique({ where: { userId_date: { userId, date } } });
}

export type DailyLogData = Omit<
  Prisma.DailyLogUncheckedCreateInput,
  "id" | "userId" | "date" | "createdAt" | "updatedAt"
>;

/** Create or replace the log for one day (every field is written, so cleared ones become NULL). */
export function upsertDailyLog(userId: string, date: Date, data: DailyLogData) {
  return db.dailyLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
  });
}

// ── Learning entries ────────────────────────────────────────────────────────

export const learningInclude = {
  track: { select: { id: true, name: true, color: true } },
  topic: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { name: true } } }, orderBy: { tag: { name: "asc" } } },
} satisfies Prisma.LearningEntryInclude;

export type LearningEntryRow = Prisma.LearningEntryGetPayload<{
  include: typeof learningInclude;
}>;

export type LearningQuery = {
  date?: Date;
  /** Scheduled on or before this date (due / overdue). */
  dueOnOrBefore?: Date;
  search?: string;
  tag?: string;
  trackId?: string;
};

export function listLearningEntries(userId: string, query: LearningQuery, take = 100) {
  const where: Prisma.LearningEntryWhereInput = {
    userId,
    date: query.date,
    trackId: query.trackId,
    ...(query.dueOnOrBefore && { revisitOn: { lte: query.dueOnOrBefore } }),
    ...(query.tag && { tags: { some: { tag: { name: query.tag } } } }),
    ...(query.search && {
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { contentMd: { contains: query.search, mode: "insensitive" } },
      ],
    }),
  };
  return db.learningEntry.findMany({
    where,
    include: learningInclude,
    orderBy: query.dueOnOrBefore
      ? [{ revisitOn: "asc" }, { date: "asc" }]
      : [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });
}

export function countLearningEntries(userId: string, query: { dueOnOrBefore?: Date }) {
  return db.learningEntry.count({
    where: { userId, ...(query.dueOnOrBefore && { revisitOn: { lte: query.dueOnOrBefore } }) },
  });
}

export function findLearningEntry(userId: string, id: string) {
  return db.learningEntry.findFirst({ where: { id, userId }, include: learningInclude });
}

export type LearningEntryData = Omit<
  Prisma.LearningEntryUncheckedCreateInput,
  "id" | "userId" | "createdAt" | "updatedAt" | "tags"
>;

async function setTags(tx: Tx, userId: string, entryId: string, names: string[]) {
  await tx.learningEntryTag.deleteMany({ where: { learningEntryId: entryId } });
  for (const name of names) {
    const tag = await tx.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
      select: { id: true },
    });
    await tx.learningEntryTag.create({ data: { learningEntryId: entryId, tagId: tag.id } });
  }
}

/** Tags no longer used anywhere. (Add other taggables here when problems get tags.) */
function deleteOrphanTags(tx: Tx, userId: string) {
  return tx.tag.deleteMany({ where: { userId, learningEntries: { none: {} } } });
}

export function createLearningEntry(userId: string, data: LearningEntryData, tags: string[]) {
  return db.$transaction(async (tx) => {
    const entry = await tx.learningEntry.create({
      data: { ...data, userId },
      select: { id: true },
    });
    await setTags(tx, userId, entry.id, tags);
    return tx.learningEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: learningInclude,
    });
  });
}

export function updateLearningEntry(
  userId: string,
  id: string,
  data: Partial<LearningEntryData>,
  tags?: string[],
) {
  return db.$transaction(async (tx) => {
    const { count } = await tx.learningEntry.updateMany({ where: { id, userId }, data });
    if (!count) return null;
    if (tags) {
      await setTags(tx, userId, id, tags);
      await deleteOrphanTags(tx, userId);
    }
    return tx.learningEntry.findUniqueOrThrow({ where: { id }, include: learningInclude });
  });
}

export function deleteLearningEntry(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const { count } = await tx.learningEntry.deleteMany({ where: { id, userId } });
    if (count) await deleteOrphanTags(tx, userId);
    return count > 0;
  });
}

export function listTagNames(userId: string) {
  return db.tag
    .findMany({ where: { userId }, orderBy: { name: "asc" }, select: { name: true } })
    .then((rows) => rows.map((r) => r.name));
}
