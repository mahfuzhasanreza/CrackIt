import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";

import type { BackupProfile, Row, TableKey, Tables } from "./spec";

type Tx = Prisma.TransactionClient;

const mine = (userId: string) => ({ where: { userId } });
const byCreated = { orderBy: { createdAt: "asc" as const } };

/** Every row the user owns, as stored (ids included; remapped on import). */
export async function readAll(userId: string): Promise<{ profile: BackupProfile; tables: Tables }> {
  const u = mine(userId);
  const [
    user,
    tracks,
    topics,
    activityTypes,
    timeEntries,
    dailyLogs,
    tags,
    learningEntries,
    learningEntryTags,
    checklists,
    checklistItems,
    checklistItemCompletions,
    problems,
    problemTags,
    projects,
    practiceQuestions,
    presentations,
    organizations,
    applications,
    applicationEvents,
    interviews,
    mockInterviews,
    resources,
    goals,
  ] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, timezone: true, dayStartHour: true },
    }),
    db.track.findMany({ ...u, ...byCreated }),
    db.topic.findMany({ ...u, ...byCreated }),
    db.activityType.findMany({ ...u, ...byCreated }),
    db.timeEntry.findMany({ ...u, orderBy: { startedAt: "asc" } }),
    db.dailyLog.findMany({ ...u, orderBy: { date: "asc" } }),
    db.tag.findMany({ ...u, ...byCreated }),
    db.learningEntry.findMany({ ...u, ...byCreated }),
    db.learningEntryTag.findMany({ where: { learningEntry: { userId } } }),
    db.checklist.findMany({ ...u, ...byCreated }),
    db.checklistItem.findMany({ ...u, ...byCreated }),
    db.checklistItemCompletion.findMany({ ...u, ...byCreated }),
    db.problem.findMany({ ...u, ...byCreated }),
    db.problemTag.findMany({ where: { problem: { userId } } }),
    db.project.findMany({ ...u, ...byCreated }),
    db.practiceQuestion.findMany({ ...u, ...byCreated }),
    db.presentation.findMany({ ...u, ...byCreated }),
    db.organization.findMany({ ...u, ...byCreated }),
    db.application.findMany({ ...u, ...byCreated }),
    db.applicationEvent.findMany({ ...u, orderBy: { at: "asc" } }),
    db.interview.findMany({ ...u, ...byCreated }),
    db.mockInterview.findMany({ ...u, ...byCreated }),
    db.resource.findMany({ ...u, ...byCreated }),
    db.goal.findMany({ ...u, ...byCreated }),
  ]);
  return {
    profile: user,
    tables: {
      tracks,
      topics,
      activityTypes,
      timeEntries,
      dailyLogs,
      tags,
      learningEntries,
      learningEntryTags,
      checklists,
      checklistItems,
      checklistItemCompletions,
      problems,
      problemTags,
      projects,
      practiceQuestions,
      presentations,
      organizations,
      applications,
      applicationEvents,
      interviews,
      mockInterviews,
      resources,
      goals,
    },
  };
}

/** Delete everything the user owns, children before parents (time entries restrict activities). */
async function deleteAll(tx: Tx, userId: string) {
  const u = mine(userId);
  await tx.timeEntry.deleteMany(u);
  await tx.goal.deleteMany(u);
  await tx.resource.deleteMany(u);
  await tx.mockInterview.deleteMany(u);
  await tx.organization.deleteMany(u); // cascades applications, events, interviews
  await tx.practiceQuestion.deleteMany(u);
  await tx.presentation.deleteMany(u);
  await tx.project.deleteMany(u);
  await tx.problem.deleteMany(u); // cascades problem tags
  await tx.checklist.deleteMany(u); // cascades items and completions
  await tx.learningEntry.deleteMany(u); // cascades note tags
  await tx.tag.deleteMany(u);
  await tx.dailyLog.deleteMany(u);
  await tx.activityType.deleteMany(u);
  await tx.topic.deleteMany(u);
  await tx.track.deleteMany(u);
}

type Insert = (tx: Tx, rows: Row[]) => Promise<unknown>;

// Rows are already validated structurally and remapped; the database checks the rest
// (types, CHECKs, uniques) and the whole import rolls back on the first error.
const INSERT: Record<TableKey, Insert> = {
  tracks: (tx, r) => tx.track.createMany({ data: r as Prisma.TrackCreateManyInput[] }),
  topics: (tx, r) => tx.topic.createMany({ data: r as Prisma.TopicCreateManyInput[] }),
  activityTypes: (tx, r) =>
    tx.activityType.createMany({ data: r as Prisma.ActivityTypeCreateManyInput[] }),
  timeEntries: (tx, r) => tx.timeEntry.createMany({ data: r as Prisma.TimeEntryCreateManyInput[] }),
  dailyLogs: (tx, r) => tx.dailyLog.createMany({ data: r as Prisma.DailyLogCreateManyInput[] }),
  tags: (tx, r) => tx.tag.createMany({ data: r as Prisma.TagCreateManyInput[] }),
  learningEntries: (tx, r) =>
    tx.learningEntry.createMany({ data: r as Prisma.LearningEntryCreateManyInput[] }),
  learningEntryTags: (tx, r) =>
    tx.learningEntryTag.createMany({ data: r as Prisma.LearningEntryTagCreateManyInput[] }),
  checklists: (tx, r) => tx.checklist.createMany({ data: r as Prisma.ChecklistCreateManyInput[] }),
  checklistItems: (tx, r) =>
    tx.checklistItem.createMany({ data: r as Prisma.ChecklistItemCreateManyInput[] }),
  checklistItemCompletions: (tx, r) =>
    tx.checklistItemCompletion.createMany({
      data: r as Prisma.ChecklistItemCompletionCreateManyInput[],
    }),
  problems: (tx, r) => tx.problem.createMany({ data: r as Prisma.ProblemCreateManyInput[] }),
  problemTags: (tx, r) =>
    tx.problemTag.createMany({ data: r as Prisma.ProblemTagCreateManyInput[] }),
  projects: (tx, r) => tx.project.createMany({ data: r as Prisma.ProjectCreateManyInput[] }),
  practiceQuestions: (tx, r) =>
    tx.practiceQuestion.createMany({ data: r as Prisma.PracticeQuestionCreateManyInput[] }),
  presentations: (tx, r) =>
    tx.presentation.createMany({ data: r as Prisma.PresentationCreateManyInput[] }),
  organizations: (tx, r) =>
    tx.organization.createMany({ data: r as Prisma.OrganizationCreateManyInput[] }),
  applications: (tx, r) =>
    tx.application.createMany({ data: r as Prisma.ApplicationCreateManyInput[] }),
  applicationEvents: (tx, r) =>
    tx.applicationEvent.createMany({ data: r as Prisma.ApplicationEventCreateManyInput[] }),
  interviews: (tx, r) => tx.interview.createMany({ data: r as Prisma.InterviewCreateManyInput[] }),
  mockInterviews: (tx, r) =>
    tx.mockInterview.createMany({ data: r as Prisma.MockInterviewCreateManyInput[] }),
  resources: (tx, r) => tx.resource.createMany({ data: r as Prisma.ResourceCreateManyInput[] }),
  goals: (tx, r) => tx.goal.createMany({ data: r as Prisma.GoalCreateManyInput[] }),
};

const CHUNK = 1000;

/** Replace all of the user's data with `tables` (already remapped) in one transaction. */
export function replaceAll(
  userId: string,
  profile: BackupProfile,
  tables: Tables,
  order: readonly TableKey[],
) {
  return db.$transaction(
    async (tx) => {
      await deleteAll(tx, userId);
      await tx.user.update({
        where: { id: userId },
        data: {
          name: profile.name,
          timezone: profile.timezone,
          dayStartHour: profile.dayStartHour,
        },
      });
      for (const key of order) {
        const rows = tables[key];
        for (let i = 0; i < rows.length; i += CHUNK) {
          await INSERT[key](tx, rows.slice(i, i + CHUNK));
        }
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}

// ── CSV sources ─────────────────────────────────────────────────────────────

export function listTimeEntriesForCsv(userId: string) {
  return db.timeEntry.findMany({
    where: { userId, endedAt: { not: null } },
    orderBy: { startedAt: "asc" },
    select: {
      startedAt: true,
      endedAt: true,
      note: true,
      focusRating: true,
      source: true,
      activityType: { select: { name: true, category: true } },
      track: { select: { name: true } },
      topic: { select: { name: true } },
    },
  });
}

export function listProblemsForCsv(userId: string) {
  return db.problem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      title: true,
      platform: true,
      url: true,
      difficulty: true,
      status: true,
      attempts: true,
      timeSpentMin: true,
      solvedAt: true,
      nextReviewOn: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
}

export function listApplicationsForCsv(userId: string) {
  return db.application.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      status: true,
      appliedOn: true,
      deadlineOn: true,
      source: true,
      jobUrl: true,
      salaryRange: true,
      organization: { select: { name: true, type: true } },
      track: { select: { name: true } },
      _count: { select: { interviews: true } },
    },
  });
}
