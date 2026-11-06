import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

const trackRef = { select: { id: true, name: true, color: true } } as const;

export function listPresentations(userId: string) {
  return db.presentation.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { track: trackRef },
  });
}

export function listQuestions(userId: string) {
  return db.practiceQuestion.findMany({
    where: { userId },
    orderBy: [{ nextReviewOn: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: { track: trackRef },
  });
}

export function countDueQuestions(userId: string, dueOnOrBefore: Date) {
  return db.practiceQuestion.count({ where: { userId, nextReviewOn: { lte: dueOnOrBefore } } });
}

export const findQuestion = (userId: string, id: string) =>
  db.practiceQuestion.findFirst({
    where: { id, userId },
    select: { id: true, nextReviewOn: true, reviewStage: true },
  });

// Create-or-update helpers: with an id, update only the user's row (false if none).

export async function savePresentation(
  userId: string,
  id: string | undefined,
  data: Omit<Prisma.PresentationUncheckedCreateInput, "userId">,
) {
  if (!id) return Boolean(await db.presentation.create({ data: { ...data, userId } }));
  return (await db.presentation.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function saveQuestion(
  userId: string,
  id: string | undefined,
  data: Omit<Prisma.PracticeQuestionUncheckedCreateInput, "userId">,
) {
  if (!id) return Boolean(await db.practiceQuestion.create({ data: { ...data, userId } }));
  return (await db.practiceQuestion.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function updateQuestionReview(
  userId: string,
  id: string,
  data: { nextReviewOn: Date | null; reviewStage: number; lastPracticedAt: Date },
) {
  return (await db.practiceQuestion.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function deleteRecord(userId: string, kind: "presentation" | "question", id: string) {
  const where = { id, userId };
  const { count } =
    kind === "presentation"
      ? await db.presentation.deleteMany({ where })
      : await db.practiceQuestion.deleteMany({ where });
  return count > 0;
}
