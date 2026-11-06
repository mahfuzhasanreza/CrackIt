import "server-only";

import { db } from "@/lib/db";

/** Read-only queries for analytics. Time entries in bulk come from time-tracking's `listEntrySpans`. */

export function listAllTracks(userId: string) {
  return db.track.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, color: true },
  });
}

export async function listRatedEntries(userId: string, start: Date, end: Date) {
  const rows = await db.timeEntry.findMany({
    where: { userId, focusRating: { not: null }, startedAt: { gte: start, lt: end } },
    select: { startedAt: true, endedAt: true, focusRating: true },
  });
  return rows.map((r) => ({ ...r, focusRating: r.focusRating! }));
}

export function listSleepLogs(userId: string, from: Date, to: Date) {
  return db.dailyLog.findMany({
    where: { userId, date: { gte: from, lte: to }, bedAt: { not: null }, wakeAt: { not: null } },
    select: { date: true, bedAt: true, wakeAt: true },
  });
}

export async function listSolvedAt(userId: string, start: Date, end: Date) {
  const rows = await db.problem.findMany({
    where: { userId, solvedAt: { gte: start, lt: end } },
    select: { solvedAt: true },
  });
  return rows.map((r) => r.solvedAt!);
}

export async function countLearningByDate(userId: string, from: Date, to: Date) {
  const rows = await db.learningEntry.groupBy({
    by: ["date"],
    where: { userId, date: { gte: from, lte: to } },
    _count: { _all: true },
  });
  return rows.map((r) => ({ date: r.date, count: r._count._all }));
}

/** Applications sent in a date range (by `applied_on`), with every status they passed through. */
export function listSentApplications(userId: string, from: Date, to: Date) {
  return db.application.findMany({
    where: { userId, appliedOn: { gte: from, lte: to } },
    select: { status: true, appliedOn: true, events: { select: { toStatus: true } } },
  });
}
