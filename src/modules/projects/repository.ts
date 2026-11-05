import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

const projectSelect = {
  id: true,
  name: true,
  description: true,
  repoUrl: true,
  liveUrl: true,
  stack: true,
  status: true,
  notesMd: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export type ProjectView = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

export function listProjects(userId: string) {
  return db.project.findMany({
    where: { userId },
    select: projectSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createProject(
  userId: string,
  data: Omit<Prisma.ProjectUncheckedCreateInput, "userId" | "sortOrder">,
) {
  const sortOrder = await db.project.count({ where: { userId } });
  return db.project.create({ data: { ...data, userId, sortOrder }, select: projectSelect });
}

export async function updateProject(
  userId: string,
  id: string,
  data: Prisma.ProjectUncheckedUpdateInput,
) {
  const { count } = await db.project.updateMany({ where: { id, userId }, data });
  return count > 0;
}

export async function deleteProject(userId: string, id: string) {
  const { count } = await db.project.deleteMany({ where: { id, userId } });
  return count > 0;
}
