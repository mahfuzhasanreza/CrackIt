import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;

export const entryInclude = {
  activityType: {
    select: { id: true, name: true, color: true, category: true, isProductive: true },
  },
  track: { select: { id: true, name: true, color: true } },
  topic: { select: { id: true, name: true } },
} satisfies Prisma.TimeEntryInclude;

export type TimeEntryView = Prisma.TimeEntryGetPayload<{ include: typeof entryInclude }>;

export function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(fn);
}

export function findRunningEntry(userId: string, client: Tx = db) {
  return client.timeEntry.findFirst({ where: { userId, endedAt: null }, include: entryInclude });
}

export function findEntry(userId: string, id: string, client: Tx = db) {
  return client.timeEntry.findFirst({ where: { id, userId }, include: entryInclude });
}

/** Entries intersecting [start, end) — `end` null means open-ended (a running entry). */
export function findOverlapping(
  userId: string,
  range: { start: Date; end: Date | null },
  excludeId?: string,
  client: Tx = db,
) {
  return client.timeEntry.findMany({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      ...(range.end ? { startedAt: { lt: range.end } } : {}),
      OR: [{ endedAt: null }, { endedAt: { gt: range.start } }],
    },
    include: entryInclude,
    orderBy: { startedAt: "asc" },
  });
}

/** Entries intersecting [start, end), for day/period views. */
export function listEntriesBetween(userId: string, start: Date, end: Date) {
  return findOverlapping(userId, { start, end });
}

export function createEntry(data: Prisma.TimeEntryUncheckedCreateInput, client: Tx = db) {
  return client.timeEntry.create({ data, include: entryInclude });
}

export function updateEntry(
  userId: string,
  id: string,
  data: Prisma.TimeEntryUncheckedUpdateInput,
  client: Tx = db,
) {
  // updateMany scopes by userId; then re-read with relations.
  return client.timeEntry
    .updateMany({ where: { id, userId }, data })
    .then(({ count }) => (count ? findEntry(userId, id, client) : null));
}

export async function deleteEntry(userId: string, id: string) {
  const { count } = await db.timeEntry.deleteMany({ where: { id, userId } });
  return count > 0;
}

// ── Ownership lookups for references ────────────────────────────────────────

export function findActivityType(userId: string, id: string, client: Tx = db) {
  return client.activityType.findFirst({
    where: { id, userId },
    select: { id: true, category: true, isArchived: true },
  });
}

export function findTrack(userId: string, id: string, client: Tx = db) {
  return client.track.findFirst({ where: { id, userId }, select: { id: true } });
}

export function findTopic(userId: string, id: string, client: Tx = db) {
  return client.topic.findFirst({ where: { id, userId }, select: { id: true, trackId: true } });
}

/** Postgres constraint violations surface differently through the driver adapter; normalise. */
export function violatedConstraint(error: unknown): string | null {
  const seen = new Set<unknown>();
  const text: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (!v || typeof v !== "object" || seen.has(v) || depth > 5) return;
    seen.add(v);
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string") text.push(`${k}=${val}`);
      else walk(val, depth + 1);
    }
    if (v instanceof Error) {
      text.push(v.message);
      walk((v as Error & { cause?: unknown }).cause, depth + 1);
    }
  };
  walk(error, 0);
  const haystack = text.join(" ");
  for (const name of ["time_entries_one_running_per_user", "time_entries_no_overlap"]) {
    if (haystack.includes(name)) return name;
  }
  if (/\bP2002\b/.test(haystack) && haystack.includes("user_id")) {
    return "time_entries_one_running_per_user";
  }
  return null;
}

export type ActivityOption = {
  id: string;
  name: string;
  color: string;
  category: import("@/generated/prisma/enums").ActivityCategory;
};

export function listActivityOptions(userId: string): Promise<ActivityOption[]> {
  return db.activityType.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, color: true, category: true },
  });
}

/** Lightweight rows for aggregations (stats, streaks) over long ranges. */
export async function listEntrySpans(userId: string, start: Date, end: Date) {
  const rows = await db.timeEntry.findMany({
    where: {
      userId,
      startedAt: { lt: end },
      OR: [{ endedAt: null }, { endedAt: { gt: start } }],
    },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      trackId: true,
      activityType: { select: { category: true, isProductive: true } },
    },
    orderBy: { startedAt: "asc" },
  });
  return rows.map(({ activityType, ...r }) => ({ ...r, ...activityType }));
}
