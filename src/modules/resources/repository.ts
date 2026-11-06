import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

const resourceSelect = {
  id: true,
  title: true,
  author: true,
  type: true,
  url: true,
  unitLabel: true,
  totalUnits: true,
  completedUnits: true,
  status: true,
  startedOn: true,
  finishedOn: true,
  rating: true,
  notesMd: true,
  updatedAt: true,
  track: { select: { id: true, name: true, color: true } },
} satisfies Prisma.ResourceSelect;

export function listResources(userId: string) {
  return db.resource.findMany({
    where: { userId },
    select: resourceSelect,
    orderBy: [{ updatedAt: "desc" }],
  });
}

export function findResource(userId: string, id: string) {
  return db.resource.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      completedUnits: true,
      totalUnits: true,
      startedOn: true,
      finishedOn: true,
    },
  });
}

export function createResource(data: Prisma.ResourceUncheckedCreateInput) {
  return db.resource.create({ data, select: { id: true } });
}

export async function updateResource(
  userId: string,
  id: string,
  data: Prisma.ResourceUncheckedUpdateInput,
) {
  return (await db.resource.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function deleteResource(userId: string, id: string) {
  return (await db.resource.deleteMany({ where: { id, userId } })).count > 0;
}
