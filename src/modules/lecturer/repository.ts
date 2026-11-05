import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

const courseRef = { select: { id: true, name: true, code: true } } as const;

export function listCourses(userId: string) {
  return db.course.findMany({
    where: { userId },
    orderBy: [{ readiness: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      syllabusUrl: true,
      readiness: true,
      notesMd: true,
      _count: { select: { teachingDemos: true, vivaQuestions: true } },
    },
  });
}

export function listDemos(userId: string) {
  return db.teachingDemo.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { course: courseRef },
  });
}

export function listPublications(userId: string) {
  return db.publication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
}

export function listViva(userId: string) {
  return db.vivaQuestion.findMany({
    where: { userId },
    orderBy: [{ nextReviewOn: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: { course: courseRef },
  });
}

export function countDueViva(userId: string, dueOnOrBefore: Date) {
  return db.vivaQuestion.count({ where: { userId, nextReviewOn: { lte: dueOnOrBefore } } });
}

export const findCourse = (userId: string, id: string) =>
  db.course.findFirst({ where: { id, userId }, select: { id: true } });

export const findCourseByName = (userId: string, name: string, excludeId?: string) =>
  db.course.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });

export const findPublication = (userId: string, id: string) =>
  db.publication.findFirst({ where: { id, userId }, select: { submittedOn: true } });

export const findViva = (userId: string, id: string) =>
  db.vivaQuestion.findFirst({
    where: { id, userId },
    select: { id: true, nextReviewOn: true, reviewStage: true },
  });

// Create-or-update helpers: with an id, update only the user's row (false if none).

export async function saveCourse(
  userId: string,
  id: string | undefined,
  data: Omit<Prisma.CourseUncheckedCreateInput, "userId">,
) {
  if (!id) return Boolean(await db.course.create({ data: { ...data, userId } }));
  return (await db.course.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function saveDemo(
  userId: string,
  id: string | undefined,
  data: Omit<Prisma.TeachingDemoUncheckedCreateInput, "userId">,
) {
  if (!id) return Boolean(await db.teachingDemo.create({ data: { ...data, userId } }));
  return (await db.teachingDemo.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function savePublication(
  userId: string,
  id: string | undefined,
  data: Omit<Prisma.PublicationUncheckedCreateInput, "userId">,
) {
  if (!id) return Boolean(await db.publication.create({ data: { ...data, userId } }));
  return (await db.publication.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function saveViva(
  userId: string,
  id: string | undefined,
  data: Omit<Prisma.VivaQuestionUncheckedCreateInput, "userId">,
) {
  if (!id) return Boolean(await db.vivaQuestion.create({ data: { ...data, userId } }));
  return (await db.vivaQuestion.updateMany({ where: { id, userId }, data })).count > 0;
}

export async function deleteRecord(
  userId: string,
  kind: "course" | "demo" | "publication" | "viva",
  id: string,
) {
  const where = { id, userId };
  const { count } =
    kind === "course"
      ? await db.course.deleteMany({ where })
      : kind === "demo"
        ? await db.teachingDemo.deleteMany({ where })
        : kind === "publication"
          ? await db.publication.deleteMany({ where })
          : await db.vivaQuestion.deleteMany({ where });
  return count > 0;
}

export async function updateVivaReview(
  userId: string,
  id: string,
  data: { nextReviewOn: Date | null; reviewStage: number; lastPracticedAt: Date },
) {
  return (await db.vivaQuestion.updateMany({ where: { id, userId }, data })).count > 0;
}
