import "server-only";

import type { ApplicationStatus } from "@/generated/prisma/enums";
import {
  dateKeyToDb,
  dbDateToKey,
  logicalDateKey,
  parseLocalDateTime,
  toDateKey,
} from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { findOwnedTrack } from "../tracks-topics/repository";

import * as repo from "./repository";
import {
  interviewBucket,
  interviewStats,
  mockScoreError,
  outcomeError,
  PIPELINE,
  statusAfterInterview,
  transition,
} from "./rules";
import type {
  ApplicationFormInput,
  InterviewFormInput,
  MockFormInput,
  OrganizationFormInput,
  OutcomeInput,
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

/** The user's logical "today" (date key). */
export async function todayFor(user: UserCtx, now = new Date()) {
  return todayKey(user, now);
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
 * Create or edit an interview. A new one can create its application on the spot (status
 * APPLIED). Adding an interview moves the application forward (OA round → OA, other rounds →
 * INTERVIEWING; see rules.ts), logged as an event. A result needs the interview to have started.
 */
export async function saveInterview(
  user: UserCtx,
  input: InterviewFormInput,
  now = new Date(),
): Promise<Result<{ id: string; applicationId: string; movedTo: ApplicationStatus | null }>> {
  const scheduledAt = parseLocalDateTime(input.scheduledAt, user.timezone);
  if (!scheduledAt) return err("VALIDATION", "Invalid date.", { scheduledAt: ["Invalid date"] });
  const tooEarly = outcomeError(input.outcome, scheduledAt, now);
  if (tooEarly) return err("VALIDATION", tooEarly, { outcome: ["Not yet"] });

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
    if (!existing || (input.applicationId && existing.applicationId !== input.applicationId)) {
      return notFound("Interview");
    }
    await repo.updateInterview(user.id, input.id, data);
    return ok({ id: input.id, applicationId: existing.applicationId, movedTo: null });
  }

  const today = todayKey(user, now);
  return repo.inTransaction(async (tx) => {
    let app = input.applicationId
      ? await repo.findApplication(user.id, input.applicationId, tx)
      : null;
    if (input.applicationId && !app) return notFound("Application");
    if (!app) {
      // New application straight from the interview form.
      const organizationId = await repo.findOrCreateOrganization(
        tx,
        user.id,
        input.newOrganizationName!,
        "COMPANY",
      );
      const created = await repo.createApplication(tx, {
        userId: user.id,
        organizationId,
        role: input.newRole!,
        status: "APPLIED",
        appliedOn: dateKeyToDb(today),
        notesMd: "",
      });
      await repo.recordEvent(tx, user.id, created.id, null, "APPLIED", now);
      app = {
        id: created.id,
        status: "APPLIED",
        appliedOn: dateKeyToDb(today),
        role: input.newRole!,
      };
    }
    const interview = await repo.createInterview(tx, {
      ...data,
      userId: user.id,
      applicationId: app.id,
    });

    const target = statusAfterInterview(app.status, input.round);
    const t = transition(
      { status: app.status, appliedOn: keyOrNull(app.appliedOn) },
      target,
      today,
    );
    if (!t.event) return ok({ id: interview.id, applicationId: app.id, movedTo: null });
    await repo.updateApplication(tx, user.id, app.id, {
      status: t.status,
      appliedOn: dbOrNull(t.appliedOn),
    });
    await repo.recordEvent(tx, user.id, app.id, t.event.from, t.event.to, now);
    return ok({ id: interview.id, applicationId: app.id, movedTo: t.status });
  });
}

/** "How did it go?": set the outcome (and optionally how it felt) without the full form. */
export async function setInterviewOutcome(
  user: UserCtx,
  input: OutcomeInput,
  now = new Date(),
): Promise<Result<null>> {
  const existing = await repo.findInterview(user.id, input.id);
  if (!existing) return notFound("Interview");
  const tooEarly = outcomeError(input.outcome, existing.scheduledAt, now);
  if (tooEarly) return err("VALIDATION", tooEarly);
  await repo.updateInterview(user.id, input.id, {
    outcome: input.outcome,
    ...(input.selfRating !== undefined ? { selfRating: input.selfRating } : {}),
  });
  return ok(null);
}

export async function getInterviewsPage(user: UserCtx, now = new Date()) {
  const [rows, mockRows, applications] = await Promise.all([
    repo.listInterviews(user.id),
    repo.listMocks(user.id),
    repo.listApplicationOptions(user.id),
  ]);
  const today = todayKey(user, now);
  // Calendar day (not logical day) in the user's zone, for grouping and the calendar.
  const interviews = rows.map((i) => ({ ...i, dayKey: toDateKey(i.scheduledAt, user.timezone) }));
  const bucket = (b: ReturnType<typeof interviewBucket>) =>
    interviews.filter((i) => interviewBucket(i, now) === b);
  const mocks = mockRows.map((m) => ({ ...m, dateKey: dbDateToKey(m.date) }));
  const scored = mocks.flatMap((m) => (m.score ? [m.score] : []));

  return {
    today,
    now,
    upcoming: bucket("upcoming"),
    needsOutcome: bucket("needsOutcome").reverse(),
    past: bucket("past").reverse(),
    all: interviews,
    stats: {
      ...interviewStats(interviews, now),
      mocksDone: mocks.filter((m) => m.dateKey <= today).length,
      avgMockScore: scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null,
    },
    mocks,
    upcomingMocks: mocks.filter((m) => m.dateKey > today).reverse(),
    pastMocks: mocks.filter((m) => m.dateKey <= today),
    applications,
  };
}

export type InterviewsPage = Awaited<ReturnType<typeof getInterviewsPage>>;
export type InterviewRow = InterviewsPage["upcoming"][number];
export type MockRow = InterviewsPage["mocks"][number];
export type ApplicationOption = InterviewsPage["applications"][number];

/** One interview with its application and that application's other rounds. */
export async function getInterviewDetail(user: UserCtx, id: string, now = new Date()) {
  const i = await repo.findInterviewDetail(user.id, id);
  if (!i) return null;
  return {
    now,
    interview: { ...i, dayKey: toDateKey(i.scheduledAt, user.timezone) },
    bucket: interviewBucket(i, now),
    otherRounds: i.application.interviews.filter((o) => o.id !== i.id),
  };
}

export type InterviewDetail = NonNullable<Awaited<ReturnType<typeof getInterviewDetail>>>;

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
  // A future mock is scheduled practice; it gets its score afterwards.
  const tooEarly = mockScoreError(input.date, todayKey(user, now), input.score);
  if (tooEarly) return err("VALIDATION", tooEarly, { score: [tooEarly] });
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
