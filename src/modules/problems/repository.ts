import "server-only";

import { db } from "@/lib/db";

import { deleteOrphanTags, upsertTagIds } from "../tags/repository";

import type { Prisma } from "@/generated/prisma/client";

export const problemInclude = {
  topic: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { name: true } } }, orderBy: { tag: { name: "asc" } } },
} satisfies Prisma.ProblemInclude;

export type ProblemRow = Prisma.ProblemGetPayload<{ include: typeof problemInclude }>;

export type ProblemQuery = {
  search?: string;
  status?: Prisma.ProblemWhereInput["status"];
  difficulty?: Prisma.ProblemWhereInput["difficulty"];
  platform?: Prisma.ProblemWhereInput["platform"];
  tag?: string;
  dueOnOrBefore?: Date;
};

export function listProblems(userId: string, q: ProblemQuery, take = 200) {
  return db.problem.findMany({
    where: {
      userId,
      status: q.status,
      difficulty: q.difficulty,
      platform: q.platform,
      ...(q.search && { title: { contains: q.search, mode: "insensitive" } }),
      ...(q.tag && { tags: { some: { tag: { name: q.tag } } } }),
      ...(q.dueOnOrBefore && { nextReviewOn: { lte: q.dueOnOrBefore } }),
    },
    include: problemInclude,
    orderBy: q.dueOnOrBefore
      ? [{ nextReviewOn: "asc" }, { updatedAt: "desc" }]
      : [{ updatedAt: "desc" }],
    take,
  });
}

export function countDueProblems(userId: string, dueOnOrBefore: Date) {
  return db.problem.count({ where: { userId, nextReviewOn: { lte: dueOnOrBefore } } });
}

/** Counts per status × difficulty, for the stats row. */
export function problemCounts(userId: string) {
  return db.problem.groupBy({
    by: ["status", "difficulty"],
    where: { userId },
    _count: { _all: true },
  });
}

/** Pattern tags used by this user's problems. */
export function listPatternNames(userId: string) {
  return db.tag
    .findMany({
      where: { userId, problems: { some: {} } },
      orderBy: { name: "asc" },
      select: { name: true },
    })
    .then((rows) => rows.map((r) => r.name));
}

export function findProblem(userId: string, id: string) {
  return db.problem.findFirst({ where: { id, userId }, include: problemInclude });
}

export function findProblemByUrl(userId: string, url: string, excludeId?: string) {
  return db.problem.findFirst({
    where: {
      userId,
      url: { equals: url, mode: "insensitive" },
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true, title: true },
  });
}

export type ProblemData = Omit<
  Prisma.ProblemUncheckedCreateInput,
  "id" | "userId" | "createdAt" | "updatedAt" | "tags"
>;

export function saveProblem(
  userId: string,
  id: string | null,
  data: Partial<ProblemData>,
  tags?: string[],
) {
  return db.$transaction(async (tx) => {
    let problemId = id;
    if (problemId) {
      const { count } = await tx.problem.updateMany({ where: { id: problemId, userId }, data });
      if (!count) return null;
    } else {
      const created = await tx.problem.create({
        data: { ...(data as ProblemData), userId },
        select: { id: true },
      });
      problemId = created.id;
    }
    if (tags) {
      await tx.problemTag.deleteMany({ where: { problemId } });
      const tagIds = await upsertTagIds(tx, userId, tags);
      await tx.problemTag.createMany({
        data: tagIds.map((tagId) => ({ problemId: problemId!, tagId })),
      });
      await deleteOrphanTags(tx, userId);
    }
    return tx.problem.findUniqueOrThrow({ where: { id: problemId }, include: problemInclude });
  });
}

export function deleteProblem(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const { count } = await tx.problem.deleteMany({ where: { id, userId } });
    if (count) await deleteOrphanTags(tx, userId);
    return count > 0;
  });
}
