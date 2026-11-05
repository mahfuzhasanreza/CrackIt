import "server-only";

import type { PublicationStatus } from "@/generated/prisma/enums";
import { dateKeyToDb, dbDateToKey, logicalDateKey } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";
import { initialReview, nextReview, type ReviewOutcome } from "@/lib/spaced-repetition";

import * as repo from "./repository";
import { scoreTrend, submittedOnFor } from "./rules";
import type {
  CourseFormInput,
  DemoFormInput,
  PublicationFormInput,
  VivaFormInput,
} from "./validators";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

const todayKey = (user: UserCtx, now: Date) =>
  logicalDateKey(now, user.timezone, user.dayStartHour);
const keyOrNull = (d: Date | null) => (d ? dbDateToKey(d) : null);

// ── Page data ───────────────────────────────────────────────────────────────

export async function getLecturerPage(user: UserCtx, now = new Date()) {
  const today = todayKey(user, now);
  const [courses, demoRows, publications, vivaRows] = await Promise.all([
    repo.listCourses(user.id),
    repo.listDemos(user.id),
    repo.listPublications(user.id),
    repo.listViva(user.id),
  ]);

  const demos = demoRows.map((d) => ({
    id: d.id,
    topic: d.topic,
    course: d.course,
    dateKey: dbDateToKey(d.date),
    durationMin: d.durationMin,
    audience: d.audience,
    selfScore: d.selfScore,
    feedbackMd: d.feedbackMd,
    recordingUrl: d.recordingUrl,
  }));
  const viva = vivaRows.map((v) => ({
    id: v.id,
    question: v.question,
    answerMd: v.answerMd,
    course: v.course,
    nextReviewOn: keyOrNull(v.nextReviewOn),
    reviewStage: v.reviewStage,
  }));
  const pubs = publications.map((p) => ({
    id: p.id,
    title: p.title,
    venue: p.venue,
    status: p.status,
    submittedOn: keyOrNull(p.submittedOn),
    url: p.url,
    notesMd: p.notesMd,
  }));

  const byStatus = Object.fromEntries(
    (["IDEA", "WRITING", "SUBMITTED", "ACCEPTED", "PUBLISHED", "REJECTED"] as const).map((s) => [
      s,
      pubs.filter((p) => p.status === s).length,
    ]),
  ) as Record<PublicationStatus, number>;

  return {
    today,
    courses: courses.map(({ _count, ...c }) => ({
      ...c,
      demoCount: _count.teachingDemos,
      vivaCount: _count.vivaQuestions,
    })),
    demos,
    publications: pubs,
    viva,
    summary: {
      demoTrend: scoreTrend(demos),
      demoCount: demos.length,
      averageReadiness: courses.length
        ? Math.round((courses.reduce((a, c) => a + c.readiness, 0) / courses.length) * 10) / 10
        : null,
      publications: byStatus,
      vivaDue: viva.filter((v) => v.nextReviewOn !== null && v.nextReviewOn <= today).length,
      vivaTotal: viva.length,
    },
  };
}

export type LecturerPage = Awaited<ReturnType<typeof getLecturerPage>>;
export type CourseView = LecturerPage["courses"][number];
export type DemoView = LecturerPage["demos"][number];
export type PublicationView = LecturerPage["publications"][number];
export type VivaView = LecturerPage["viva"][number];

export function countDueViva(user: UserCtx, now = new Date()) {
  return repo.countDueViva(user.id, dateKeyToDb(todayKey(user, now)));
}

// ── Mutations ───────────────────────────────────────────────────────────────

const notFound = (what: string) => err("NOT_FOUND", `${what} not found.`);

async function checkCourse(userId: string, courseId?: string): Promise<Result<string | null>> {
  if (!courseId) return ok(null);
  return (await repo.findCourse(userId, courseId))
    ? ok(courseId)
    : err("VALIDATION", "Unknown course.", { courseId: ["Unknown course"] });
}

export async function saveCourse(userId: string, input: CourseFormInput): Promise<Result<null>> {
  if (await repo.findCourseByName(userId, input.name, input.id)) {
    return err("CONFLICT", "You already have a course with that name.", {
      name: ["Already exists"],
    });
  }
  const saved = await repo.saveCourse(userId, input.id, {
    name: input.name,
    code: input.code ?? null,
    syllabusUrl: input.syllabusUrl ?? null,
    readiness: input.readiness,
    notesMd: input.notesMd,
  });
  return saved ? ok(null) : notFound("Course");
}

export async function saveDemo(
  user: UserCtx,
  input: DemoFormInput,
  now = new Date(),
): Promise<Result<null>> {
  if (input.date > todayKey(user, now)) {
    return err("VALIDATION", "A demo can't be in the future.", { date: ["In the future"] });
  }
  const course = await checkCourse(user.id, input.courseId);
  if (!course.ok) return course;
  const saved = await repo.saveDemo(user.id, input.id, {
    topic: input.topic,
    courseId: course.data,
    date: dateKeyToDb(input.date),
    durationMin: input.durationMin,
    audience: input.audience,
    selfScore: input.selfScore ?? null,
    feedbackMd: input.feedbackMd,
    recordingUrl: input.recordingUrl ?? null,
  });
  return saved ? ok(null) : notFound("Demo");
}

export async function savePublication(
  user: UserCtx,
  input: PublicationFormInput,
  now = new Date(),
): Promise<Result<null>> {
  const today = todayKey(user, now);
  if (input.submittedOn && input.submittedOn > today) {
    return err("VALIDATION", "Submission date can't be in the future.", {
      submittedOn: ["In the future"],
    });
  }
  const existing = input.id ? await repo.findPublication(user.id, input.id) : null;
  if (input.id && !existing) return notFound("Publication");
  const submittedOn = submittedOnFor(
    input.status,
    input.submittedOn,
    keyOrNull(existing?.submittedOn ?? null),
    today,
  );
  const saved = await repo.savePublication(user.id, input.id, {
    title: input.title,
    venue: input.venue ?? null,
    status: input.status,
    submittedOn: submittedOn ? dateKeyToDb(submittedOn) : null,
    url: input.url ?? null,
    notesMd: input.notesMd,
  });
  return saved ? ok(null) : notFound("Publication");
}

/** New questions are first practised tomorrow; edits keep the schedule. */
export async function saveViva(
  user: UserCtx,
  input: VivaFormInput,
  now = new Date(),
): Promise<Result<null>> {
  const course = await checkCourse(user.id, input.courseId);
  if (!course.ok) return course;
  const base = { question: input.question, answerMd: input.answerMd, courseId: course.data };
  if (input.id) {
    const existing = await repo.findViva(user.id, input.id);
    if (!existing) return notFound("Question");
    await repo.saveViva(user.id, input.id, {
      ...base,
      nextReviewOn: existing.nextReviewOn,
      reviewStage: existing.reviewStage,
    });
    return ok(null);
  }
  const first = initialReview(todayKey(user, now));
  await repo.saveViva(user.id, undefined, {
    ...base,
    nextReviewOn: dateKeyToDb(first.revisitOn!),
    reviewStage: first.stage,
  });
  return ok(null);
}

/** Practise a question: remembered → next step; forgot → back tomorrow. */
export async function practiseViva(
  user: UserCtx,
  id: string,
  outcome: ReviewOutcome,
  now = new Date(),
): Promise<Result<{ nextReviewOn: string | null }>> {
  const existing = await repo.findViva(user.id, id);
  if (!existing) return notFound("Question");
  const next = nextReview(existing.reviewStage, outcome, todayKey(user, now));
  await repo.updateVivaReview(user.id, id, {
    nextReviewOn: next.revisitOn ? dateKeyToDb(next.revisitOn) : null,
    reviewStage: next.stage,
    lastPracticedAt: now,
  });
  return ok({ nextReviewOn: next.revisitOn });
}

export async function deleteRecord(
  userId: string,
  kind: "course" | "demo" | "publication" | "viva",
  id: string,
): Promise<Result<null>> {
  return (await repo.deleteRecord(userId, kind, id)) ? ok(null) : notFound("Item");
}
