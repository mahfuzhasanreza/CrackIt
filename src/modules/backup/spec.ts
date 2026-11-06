/**
 * The backup format: every user-owned table, parents before children. `refs` maps each
 * foreign-key column to the table it points at; on import every id is replaced with a fresh one
 * and every reference is rewritten, so a backup can be restored into any account.
 */

import type { Prisma } from "@/generated/prisma/client";

export const BACKUP_APP = "crackit";
export const BACKUP_VERSION = 1;

export type TableSpec = {
  key: string;
  /** Has its own `id` column (join tables use composite keys). */
  hasId: boolean;
  /** Has a `userId` column (overwritten on import). */
  owned: boolean;
  refs: Record<string, string>;
};

export const TABLES = [
  { key: "tracks", hasId: true, owned: true, refs: {} },
  { key: "topics", hasId: true, owned: true, refs: { trackId: "tracks", parentId: "topics" } },
  { key: "activityTypes", hasId: true, owned: true, refs: {} },
  {
    key: "timeEntries",
    hasId: true,
    owned: true,
    refs: { activityTypeId: "activityTypes", trackId: "tracks", topicId: "topics" },
  },
  { key: "dailyLogs", hasId: true, owned: true, refs: {} },
  { key: "tags", hasId: true, owned: true, refs: {} },
  {
    key: "learningEntries",
    hasId: true,
    owned: true,
    refs: { trackId: "tracks", topicId: "topics" },
  },
  {
    key: "learningEntryTags",
    hasId: false,
    owned: false,
    refs: { learningEntryId: "learningEntries", tagId: "tags" },
  },
  { key: "checklists", hasId: true, owned: true, refs: { trackId: "tracks" } },
  { key: "checklistItems", hasId: true, owned: true, refs: { checklistId: "checklists" } },
  {
    key: "checklistItemCompletions",
    hasId: false,
    owned: true,
    refs: { itemId: "checklistItems" },
  },
  { key: "problems", hasId: true, owned: true, refs: { topicId: "topics" } },
  {
    key: "problemTags",
    hasId: false,
    owned: false,
    refs: { problemId: "problems", tagId: "tags" },
  },
  { key: "projects", hasId: true, owned: true, refs: {} },
  { key: "courses", hasId: true, owned: true, refs: {} },
  { key: "teachingDemos", hasId: true, owned: true, refs: { courseId: "courses" } },
  { key: "publications", hasId: true, owned: true, refs: {} },
  { key: "vivaQuestions", hasId: true, owned: true, refs: { courseId: "courses" } },
  { key: "organizations", hasId: true, owned: true, refs: {} },
  {
    key: "applications",
    hasId: true,
    owned: true,
    refs: { organizationId: "organizations", trackId: "tracks" },
  },
  { key: "applicationEvents", hasId: true, owned: true, refs: { applicationId: "applications" } },
  { key: "interviews", hasId: true, owned: true, refs: { applicationId: "applications" } },
  { key: "mockInterviews", hasId: true, owned: true, refs: { trackId: "tracks" } },
  { key: "resources", hasId: true, owned: true, refs: { trackId: "tracks" } },
  { key: "goals", hasId: true, owned: true, refs: { trackId: "tracks" } },
] as const satisfies readonly TableSpec[];

export type TableKey = (typeof TABLES)[number]["key"];
export type Row = Record<string, unknown>;
export type Tables = Record<TableKey, Row[]>;

export type BackupProfile = { name: string | null; timezone: string; dayStartHour: number };

export type Backup = {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  profile: BackupProfile;
  tables: Tables;
};

export const TABLE_LABEL: Record<TableKey, string> = {
  tracks: "Tracks",
  topics: "Topics",
  activityTypes: "Activity types",
  timeEntries: "Time entries",
  dailyLogs: "Daily logs",
  tags: "Tags",
  learningEntries: "Learning notes",
  learningEntryTags: "Note tags",
  checklists: "Checklists",
  checklistItems: "Checklist items",
  checklistItemCompletions: "Habit ticks",
  problems: "Problems",
  problemTags: "Problem tags",
  projects: "Projects",
  courses: "Courses",
  teachingDemos: "Teaching demos",
  publications: "Publications",
  vivaQuestions: "Viva questions",
  organizations: "Organizations",
  applications: "Applications",
  applicationEvents: "Application history",
  interviews: "Interviews",
  mockInterviews: "Mock interviews",
  resources: "Resources",
  goals: "Goals",
};

/**
 * Compile-time guard: adding a Prisma model fails typecheck until it's mapped to a backup table
 * here (and added to `TABLES` and `backup/repository.ts`). Users and login / sign-up attempts aren't data.
 */
export const MODEL_TABLE: Record<
  Exclude<Prisma.ModelName, "User" | "LoginAttempt" | "SignupAttempt">,
  TableKey
> = {
  Track: "tracks",
  Topic: "topics",
  ActivityType: "activityTypes",
  TimeEntry: "timeEntries",
  DailyLog: "dailyLogs",
  LearningEntry: "learningEntries",
  Tag: "tags",
  LearningEntryTag: "learningEntryTags",
  Checklist: "checklists",
  ChecklistItem: "checklistItems",
  ChecklistItemCompletion: "checklistItemCompletions",
  Problem: "problems",
  ProblemTag: "problemTags",
  Project: "projects",
  Course: "courses",
  TeachingDemo: "teachingDemos",
  Publication: "publications",
  VivaQuestion: "vivaQuestions",
  Organization: "organizations",
  Application: "applications",
  ApplicationEvent: "applicationEvents",
  Interview: "interviews",
  MockInterview: "mockInterviews",
  Resource: "resources",
  Goal: "goals",
};
