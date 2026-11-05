import "server-only";

import type { ApplicationStatus } from "@/generated/prisma/enums";
import { dateKeyToDb, dbDateToKey, logicalDateKey, parseLocalDateTime } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { findOwnedTrack } from "../tracks-topics/repository";

import * as repo from "./repository";
import { PIPELINE, statusAfterInterview, transition } from "./rules";
import type {
  ApplicationFormInput,
  InterviewFormInput,
  MockFormInput,
  OrganizationFormInput,
} from "./validators";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

const todayKey = (user: UserCtx, now: Date) =>
  logicalDateKey(now, user.timezone, user.dayStartHour);
const keyOrNull = (d: Date | null) => (d ? dbDateToKey(d) : null);
const dbOrNull = (k: string | null | undefined) => (k ? dateKeyToDb(k) : null);
const notFound = (what: string) => err("NOT_FOUND", `${what} not found.`);

async function checkTrack(userId: string, trackId?: string): Promise<Result<string | null>> {
  if (!trackId) return ok(null);
  return (await findOwnedTrack(userId, trackId))
    ? ok(trackId)
    : err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
}

// ── Board ───────────────────────────────────────────────────────────────────

export async function getBoard(user: UserCtx, now = new Date()) {
  const rows = await repo.listApplications(user.id, now);
  const cards = rows.map((a) => ({
    id: a.id,
    role: a.role,
    status: a.status,
    organization: a.organization,
    track: a.track,
    jobUrl: a.jobUrl,
    source: a.source,
    salaryRange: a.salaryRange,
    notesMd: a.notesMd,
    appliedOn: keyOrNull(a.appliedOn),
    deadlineOn: keyOrNull(a.deadlineOn),
    nextInterview: a.interviews[0] ?? null,
    interviewCount: a._count.interviews,
  }));
  const columns = PIPELINE.map((status) => ({
    status,
    cards: cards.filter((c) => c.status === status),
  }));
  return { today: todayKey(user, now), columns };
}

export type Board = Awaited<ReturnType<typeof getBoard>>;
export type ApplicationCard = Board["columns"][number]["cards"][number];

export async function getApplicationDetail(user: UserCtx, id: string, now = new Date()) {
  const a = await repo.findApplicationDetail(user.id, id);
  if (!a) return null;
  return {
    today: todayKey(user, now),
    application: {
      ...a,
      appliedOn: keyOrNull(a.appliedOn),
      deadlineOn: keyOrNull(a.deadlineOn),
    },
  };
}

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplicationDetail>>>;

export function listOrganizations(userId: string) {
  return repo.listOrganizations(userId);
}

export function listApplicationOptions(userId: string) {
  return repo.listApplicationOptions(userId);
}

// ── Applications ────────────────────────────────────────────────────────────

/** Create (no `id`) or edit an application. A status change is logged as an event. */
export async function saveApplication(
  user: UserCtx,
  input: ApplicationFormInput,
  now = new Date(),
): Promise<Result<{ id: string }>> {
  const today = todayKey(user, now);
  if (input.appliedOn && input.appliedOn > today) {
    return err("VALIDATION", "Applied date can't be in the future.", {
      appliedOn: ["In the future"],
    });
  }
  const track = await checkTrack(user.id, input.trackId);
  if (!track.ok) return track;

  return repo.inTransaction(async (tx) => {
    const organizationId = await repo.findOrCreateOrganization(
      tx,
      user.id,
      input.organizationName,
      input.organizationType,
    );
    const fields = {
      organizationId,
      trackId: track.data,
      role: input.role,
      jobUrl: input.jobUrl ?? null,
      source: input.source ?? null,
      deadlineOn: dbOrNull(input.deadlineOn),
      salaryRange: input.salaryRange ?? null,
      notesMd: input.notesMd,
    };

    if (!input.id) {
      const appliedOn = input.appliedOn ?? (input.status === "WISHLIST" ? null : today);
      const created = await repo.createApplication(tx, {
        ...fields,
        userId: user.id,
        status: input.status,
        appliedOn: dbOrNull(appliedOn),
      });
      await repo.recordEvent(tx, user.id, created.id, null, input.status, now);
      return ok(created);
    }

    const existing = await repo.findApplication(user.id, input.id, tx);
    if (!existing) return notFound("Application");
    const t = transition(
      { status: existing.status, appliedOn: keyOrNull(existing.appliedOn) },
      input.status,
      today,
    );
    await repo.updateApplication(tx, user.id, existing.id, {
      ...fields,
      status: t.status,
      appliedOn: dbOrNull(input.appliedOn ?? t.appliedOn),
    });
    if (t.event) await repo.recordEvent(tx, user.id, existing.id, t.event.from, t.event.to, now);
    return ok({ id: existing.id });
  });
}

/** Drag-and-drop / "Move to" on the board. */
export async function moveApplication(
  user: UserCtx,
  id: string,
  to: ApplicationStatus,
  now = new Date(),
): Promise<Result<{ changed: boolean }>> {
  return repo.inTransaction(async (tx) => {
    const existing = await repo.findApplication(user.id, id, tx);
    if (!existing) return notFound("Application");
    const t = transition(
      { status: existing.status, appliedOn: keyOrNull(existing.appliedOn) },
      to,
      todayKey(user, now),
    );
    if (!t.event) return ok({ changed: false });
    await repo.updateApplication(tx, user.id, id, {
      status: t.status,
      appliedOn: dbOrNull(t.appliedOn),
    });
    await repo.recordEvent(tx, user.id, id, t.event.from, t.event.to, now);
    return ok({ changed: true });
  });
}

export async function saveOrganization(
  userId: string,
  input: OrganizationFormInput,
): Promise<Result<null>> {
  if (await repo.findOrganizationByName(userId, input.name, input.id)) {
    return err("CONFLICT", "You already have an organization with that name.", {
      name: ["Already exists"],
    });
  }
  const updated = await repo.updateOrganization(userId, input.id, {
    name: input.name,
    type: input.type,
    website: input.website ?? null,
    location: input.location ?? null,
    notesMd: input.notesMd,
  });
  return updated ? ok(null) : notFound("Organization");
}

// ── Interviews ──────────────────────────────────────────────────────────────

/**
 * Create or edit an interview. Adding one moves the application forward
 * (OA round → OA, other rounds → INTERVIEWING; see rules.ts), logged as an event.
 */
export async function saveInterview(
  user: UserCtx,
  input: InterviewFormInput,
  now = new Date(),
): Promise<Result<{ movedTo: ApplicationStatus | null }>> {
  const scheduledAt = parseLocalDateTime(input.scheduledAt, user.timezone);
  if (!scheduledAt) return err("VALIDATION", "Invalid date.", { scheduledAt: ["Invalid date"] });

  const data = {
    round: input.round,
    scheduledAt,
    durationMin: input.durationMin ?? null,
    interviewer: input.interviewer ?? null,
    outcome: input.outcome,
    selfRating: input.selfRating ?? null,
    questionsMd: input.questionsMd,
    myAnswersMd: input.myAnswersMd,
    lessonsMd: input.lessonsMd,
  };

  if (input.id) {
    const existing = await repo.findInterview(user.id, input.id);
    if (!existing || existing.applicationId !== input.applicationId) return notFound("Interview");
    await repo.updateInterview(user.id, input.id, data);
    return ok({ movedTo: null });
  }

  return repo.inTransaction(async (tx) => {
    const app = await repo.findApplication(user.id, input.applicationId, tx);
    if (!app) return notFound("Application");
    await repo.createInterview(tx, { ...data, userId: user.id, applicationId: app.id });

    const target = statusAfterInterview(app.status, input.round);
    const t = transition(
      { status: app.status, appliedOn: keyOrNull(app.appliedOn) },
      target,
      todayKey(user, now),
    );
    if (!t.event) return ok({ movedTo: null });
    await repo.updateApplication(tx, user.id, app.id, {
      status: t.status,
      appliedOn: dbOrNull(t.appliedOn),
    });
    await repo.recordEvent(tx, user.id, app.id, t.event.from, t.event.to, now);
    return ok({ movedTo: t.status });
  });
}

export async function getInterviewsPage(user: UserCtx, now = new Date()) {
  const [interviews, mocks, applications] = await Promise.all([
    repo.listInterviews(user.id),
    repo.listMocks(user.id),
    repo.listApplicationOptions(user.id),
  ]);
  return {
    today: todayKey(user, now),
    now,
    upcoming: interviews.filter((i) => i.scheduledAt >= now),
    past: interviews.filter((i) => i.scheduledAt < now).reverse(),
    mocks: mocks.map((m) => ({ ...m, dateKey: dbDateToKey(m.date) })),
    applications,
  };
}

export type InterviewsPage = Awaited<ReturnType<typeof getInterviewsPage>>;
export type InterviewRow = InterviewsPage["upcoming"][number];
export type MockRow = InterviewsPage["mocks"][number];
export type ApplicationOption = InterviewsPage["applications"][number];

/** Pending interviews in the next `days` days, soonest first (dashboard). */
export function getUpcomingInterviews(userId: string, now = new Date(), days = 14, take = 5) {
  return repo.listUpcomingInterviews(
    userId,
    now,
    new Date(now.getTime() + days * 86_400_000),
    take,
  );
}

// ── Mock interviews ─────────────────────────────────────────────────────────

export async function saveMock(
  user: UserCtx,
  input: MockFormInput,
  now = new Date(),
): Promise<Result<null>> {
  if (input.date > todayKey(user, now)) {
    return err("VALIDATION", "A mock interview can't be in the future.", {
      date: ["In the future"],
    });
  }
  const track = await checkTrack(user.id, input.trackId);
  if (!track.ok) return track;
  const saved = await repo.saveMock(user.id, input.id, {
    date: dateKeyToDb(input.date),
    partner: input.partner ?? null,
    type: input.type,
    trackId: track.data,
    score: input.score ?? null,
    feedbackMd: input.feedbackMd,
  });
  return saved ? ok(null) : notFound("Mock interview");
}

export async function deleteRecord(
  userId: string,
  kind: "application" | "organization" | "interview" | "mock",
  id: string,
): Promise<Result<null>> {
  return (await repo.deleteRecord(userId, kind, id)) ? ok(null) : notFound("Item");
}
