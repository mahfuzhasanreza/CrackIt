import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

// ── Profile & password ──────────────────────────────────────────────────────

export function findProfile(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, timezone: true, dayStartHour: true },
  });
}

export function updateProfile(userId: string, data: Prisma.UserUpdateInput) {
  return db.user.update({ where: { id: userId }, data, select: { id: true } });
}

export function findPasswordHash(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
}

/** New password + bump the session version, which signs out every session (this one too). */
export function setPassword(userId: string, passwordHash: string) {
  return db.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    select: { id: true },
  });
}

// ── Tracks ──────────────────────────────────────────────────────────────────

export function listTracks(userId: string) {
  return db.track.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      weeklyTargetMinutes: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { topics: true, timeEntries: true } },
    },
  });
}

export function findTrackByName(userId: string, name: string, excludeId?: string) {
  return db.track.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });
}

export async function createTrack(
  userId: string,
  data: Omit<Prisma.TrackUncheckedCreateInput, "userId" | "sortOrder">,
) {
  const last = await db.track.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return db.track.create({
    data: { ...data, userId, sortOrder: (last?.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
}

export async function updateTrack(
  userId: string,
  id: string,
  data: Prisma.TrackUncheckedUpdateInput,
) {
  return (await db.track.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function deleteTrack(userId: string, id: string) {
  return (await db.track.deleteMany({ where: { id, userId } })).count > 0;
}

// ── Activity types ──────────────────────────────────────────────────────────

export function listActivityTypes(userId: string) {
  return db.activityType.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      category: true,
      isProductive: true,
      isArchived: true,
      sortOrder: true,
      _count: { select: { timeEntries: true } },
    },
  });
}

export function findActivityTypeByName(userId: string, name: string, excludeId?: string) {
  return db.activityType.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });
}

export async function createActivityType(
  userId: string,
  data: Omit<Prisma.ActivityTypeUncheckedCreateInput, "userId" | "sortOrder">,
) {
  const last = await db.activityType.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return db.activityType.create({
    data: { ...data, userId, sortOrder: (last?.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
}

export async function updateActivityType(
  userId: string,
  id: string,
  data: Prisma.ActivityTypeUncheckedUpdateInput,
) {
  return (await db.activityType.updateMany({ where: { id, userId }, data })).count > 0;
}

export function countEntriesForActivity(userId: string, id: string) {
  return db.timeEntry.count({ where: { userId, activityTypeId: id } });
}

export async function deleteActivityType(userId: string, id: string) {
  return (await db.activityType.deleteMany({ where: { id, userId } })).count > 0;
}

// ── Ordering (shared) ───────────────────────────────────────────────────────

/** Rewrite sort orders for an already-ordered id list (both ids owned by `userId`). */
export function reorder(kind: "track" | "activityType", userId: string, orderedIds: string[]) {
  return db.$transaction(
    orderedIds.map((id, sortOrder) =>
      kind === "track"
        ? db.track.updateMany({ where: { id, userId }, data: { sortOrder } })
        : db.activityType.updateMany({ where: { id, userId }, data: { sortOrder } }),
    ),
  );
}
