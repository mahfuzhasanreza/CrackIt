import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

export function listGoals(userId: string) {
  return db.goal.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      metric: true,
      period: true,
      target: true,
      startsOn: true,
      endsOn: true,
      track: { select: { id: true, name: true, color: true } },
    },
  });
}

export function createGoal(data: Prisma.GoalUncheckedCreateInput) {
  return db.goal.create({ data, select: { id: true } });
}

export async function updateGoal(
  userId: string,
  id: string,
  data: Prisma.GoalUncheckedUpdateInput,
) {
  return (await db.goal.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function deleteGoal(userId: string, id: string) {
  return (await db.goal.deleteMany({ where: { id, userId } })).count > 0;
}
