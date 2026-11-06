import "server-only";

import { db } from "@/lib/db";

import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus, OrganizationType } from "@/generated/prisma/enums";

export type Tx = Prisma.TransactionClient;

export const inTransaction = <T>(fn: (tx: Tx) => Promise<T>) => db.$transaction(fn);

const orgRef = { select: { id: true, name: true, type: true } } as const;
const trackRef = { select: { id: true, name: true, color: true } } as const;

// ── Applications ────────────────────────────────────────────────────────────

/** Board cards: every application with its organization, track and next pending interview. */
export function listApplications(userId: string, now: Date) {
  return db.application.findMany({
    where: { userId },
    orderBy: [{ deadlineOn: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    include: {
      organization: orgRef,
      track: trackRef,
      interviews: {
        where: { scheduledAt: { gte: now }, outcome: "PENDING" },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        select: { id: true, round: true, scheduledAt: true },
      },
      _count: { select: { interviews: true } },
    },
  });
}

export function findApplicationDetail(userId: string, id: string) {
  return db.application.findFirst({
    where: { id, userId },
    include: {
      organization: true,
      track: trackRef,
      events: {
        orderBy: { at: "asc" },
        select: { id: true, fromStatus: true, toStatus: true, at: true },
      },
      interviews: { orderBy: { scheduledAt: "asc" } },
    },
  });
}

export function findApplication(userId: string, id: string, client: Tx | typeof db = db) {
  return client.application.findFirst({
    where: { id, userId },
    select: { id: true, status: true, appliedOn: true, role: true },
  });
}

export function listApplicationOptions(userId: string) {
  return db.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, role: true, status: true, organization: { select: { name: true } } },
  });
}

/** Find an organization by name (case-insensitive) or create it. */
export async function findOrCreateOrganization(
  tx: Tx,
  userId: string,
  name: string,
  type: OrganizationType,
) {
  const existing = await tx.organization.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  return (await tx.organization.create({ data: { userId, name, type }, select: { id: true } })).id;
}

export function createApplication(
  tx: Tx,
  data: Omit<Prisma.ApplicationUncheckedCreateInput, "id" | "createdAt" | "updatedAt">,
) {
  return tx.application.create({ data, select: { id: true } });
}

export async function updateApplication(
  tx: Tx,
  userId: string,
  id: string,
  data: Prisma.ApplicationUncheckedUpdateInput,
) {
  return (await tx.application.updateMany({ where: { id, userId }, data })).count > 0;
}

export function recordEvent(
  tx: Tx,
  userId: string,
  applicationId: string,
  fromStatus: ApplicationStatus | null,
  toStatus: ApplicationStatus,
  at: Date,
) {
  return tx.applicationEvent.create({ data: { userId, applicationId, fromStatus, toStatus, at } });
}

// ── Organizations ───────────────────────────────────────────────────────────

export function listOrganizations(userId: string) {
  return db.organization.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { applications: true } } },
  });
}

export function findOrganizationByName(userId: string, name: string, excludeId: string) {
  return db.organization.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" }, id: { not: excludeId } },
    select: { id: true },
  });
}

export async function updateOrganization(
  userId: string,
  id: string,
  data: Prisma.OrganizationUncheckedUpdateInput,
) {
  return (await db.organization.updateMany({ where: { id, userId }, data })).count > 0;
}

// ── Interviews ──────────────────────────────────────────────────────────────

const interviewInclude = {
  application: { select: { id: true, role: true, organization: { select: { name: true } } } },
} satisfies Prisma.InterviewInclude;

export function listInterviews(userId: string) {
  return db.interview.findMany({
    where: { userId },
    orderBy: { scheduledAt: "asc" },
    include: interviewInclude,
  });
}

export function listUpcomingInterviews(userId: string, from: Date, until: Date, take: number) {
  return db.interview.findMany({
    where: { userId, scheduledAt: { gte: from, lt: until }, outcome: "PENDING" },
    orderBy: { scheduledAt: "asc" },
    include: interviewInclude,
    take,
  });
}

export function findInterview(userId: string, id: string) {
  return db.interview.findFirst({
    where: { id, userId },
    select: { id: true, applicationId: true, scheduledAt: true },
  });
}

export function findInterviewDetail(userId: string, id: string) {
  return db.interview.findFirst({
    where: { id, userId },
    include: {
      application: {
        select: {
          id: true,
          role: true,
          status: true,
          jobUrl: true,
          organization: { select: { id: true, name: true, type: true } },
          interviews: {
            orderBy: { scheduledAt: "asc" },
            select: { id: true, round: true, scheduledAt: true, outcome: true },
          },
        },
      },
    },
  });
}

export function createInterview(tx: Tx, data: Prisma.InterviewUncheckedCreateInput) {
  return tx.interview.create({ data, select: { id: true } });
}

export async function updateInterview(
  userId: string,
  id: string,
  data: Prisma.InterviewUncheckedUpdateInput,
) {
  return (await db.interview.updateMany({ where: { id, userId }, data })).count > 0;
}

// ── Mock interviews ─────────────────────────────────────────────────────────

export function listMocks(userId: string) {
  return db.mockInterview.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { track: trackRef },
  });
}

export async function saveMock(
  userId: string,
  id: string | undefined,
  data: Omit<Prisma.MockInterviewUncheckedCreateInput, "userId">,
) {
  if (!id) return Boolean(await db.mockInterview.create({ data: { ...data, userId } }));
  return (await db.mockInterview.updateMany({ where: { id, userId }, data })).count > 0;
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteRecord(
  userId: string,
  kind: "application" | "organization" | "interview" | "mock",
  id: string,
) {
  const where = { id, userId };
  const { count } =
    kind === "application"
      ? await db.application.deleteMany({ where })
      : kind === "organization"
        ? await db.organization.deleteMany({ where })
        : kind === "interview"
          ? await db.interview.deleteMany({ where })
          : await db.mockInterview.deleteMany({ where });
  return count > 0;
}
