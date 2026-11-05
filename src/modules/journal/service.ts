import "server-only";

import { dateKeyToDb, dbDateToKey, logicalDateKey, shiftDateKey } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { findOwnedTopic, findOwnedTrack } from "../tracks-topics/repository";

import * as repo from "./repository";
import { resolveSleepTimes, sleepDurationMs, sleepError, toTimeInput } from "./sleep";
import { initialReview, nextReview, type ReviewOutcome } from "./spaced-repetition";
import type { DailyLogFormInput, LearningEntryInput, LearningFilter } from "./validators";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

const todayKey = (user: UserCtx, now: Date) =>
  logicalDateKey(now, user.timezone, user.dayStartHour);

// ── Views (dates as "YYYY-MM-DD" keys, tags as names) ───────────────────────

export type LearningEntryView = {
  id: string;
  dateKey: string;
  title: string;
  contentMd: string;
  sourceUrl: string | null;
  confidence: number | null;
  revisitOn: string | null;
  reviewStage: number;
  lastReviewedAt: Date | null;
  track: { id: string; name: string; color: string } | null;
  topic: { id: string; name: string } | null;
  tags: string[];
};

function toEntryView(row: repo.LearningEntryRow): LearningEntryView {
  return {
    id: row.id,
    dateKey: dbDateToKey(row.date),
    title: row.title,
    contentMd: row.contentMd,
    sourceUrl: row.sourceUrl,
    confidence: row.confidence,
    revisitOn: row.revisitOn ? dbDateToKey(row.revisitOn) : null,
    reviewStage: row.reviewStage,
    lastReviewedAt: row.lastReviewedAt,
    track: row.track,
    topic: row.topic,
    tags: row.tags.map((t) => t.tag.name),
  };
}

export type DailyLogView = {
  dateKey: string;
  mood: number | null;
  energy: number | null;
  sleepQuality: number | null;
  /** "HH:MM" in the user's timezone, for the form. */
  bedTime: string | null;
  wakeTime: string | null;
  sleepMs: number | null;
  planForDay: string | null;
  reflection: string | null;
  wins: string | null;
  blockers: string | null;
  updatedAt: Date;
};

function toLogView(
  row: NonNullable<Awaited<ReturnType<typeof repo.findDailyLog>>>,
  tz: string,
): DailyLogView {
  return {
    dateKey: dbDateToKey(row.date),
    mood: row.mood,
    energy: row.energy,
    sleepQuality: row.sleepQuality,
    bedTime: row.bedAt ? toTimeInput(row.bedAt, tz) : null,
    wakeTime: row.wakeAt ? toTimeInput(row.wakeAt, tz) : null,
    sleepMs: sleepDurationMs({ bedAt: row.bedAt, wakeAt: row.wakeAt }),
    planForDay: row.planForDay,
    reflection: row.reflection,
    wins: row.wins,
    blockers: row.blockers,
    updatedAt: row.updatedAt,
  };
}

// ── Daily log ───────────────────────────────────────────────────────────────

/** Save (create or overwrite) one day's log. Tomorrow is allowed so you can plan ahead. */
export async function saveDailyLog(
  user: UserCtx,
  input: DailyLogFormInput,
  now = new Date(),
): Promise<Result<DailyLogView>> {
  if (input.date > shiftDateKey(todayKey(user, now), 1)) {
    return err("VALIDATION", "You can plan tomorrow at most.", { date: ["Too far ahead"] });
  }
  const sleep = resolveSleepTimes(input.date, input, user.timezone, user.dayStartHour);
  const problem = sleepError(sleep);
  if (problem) return err("VALIDATION", problem, { wakeTime: [problem] });

  const row = await repo.upsertDailyLog(user.id, dateKeyToDb(input.date), {
    mood: input.mood ?? null,
    energy: input.energy ?? null,
    sleepQuality: input.sleepQuality ?? null,
    bedAt: sleep.bedAt,
    wakeAt: sleep.wakeAt,
    planForDay: input.planForDay ?? null,
    reflection: input.reflection ?? null,
    wins: input.wins ?? null,
    blockers: input.blockers ?? null,
  });
  return ok(toLogView(row, user.timezone));
}

// ── Learning entries ────────────────────────────────────────────────────────

/** Check the user owns the track/topic; a topic implies its track. */
async function resolveTrackTopic(
  userId: string,
  input: { trackId?: string; topicId?: string },
): Promise<Result<{ trackId: string | null; topicId: string | null }>> {
  let trackId = input.trackId ?? null;
  const topicId = input.topicId ?? null;
  if (trackId && !(await findOwnedTrack(userId, trackId))) {
    return err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
  }
  if (topicId) {
    const topic = await findOwnedTopic(userId, topicId);
    if (!topic) return err("VALIDATION", "Unknown topic.", { topicId: ["Unknown topic"] });
    if (trackId && topic.trackId !== trackId) {
      return err("VALIDATION", "That topic belongs to a different track.", {
        topicId: ["Topic is not in the selected track"],
      });
    }
    trackId = topic.trackId;
  }
  return ok({ trackId, topicId });
}

function notInFuture(date: string, today: string): Result<null> {
  return date > today
    ? err("VALIDATION", "Can't log learning for a future day.", { date: ["In the future"] })
    : ok(null);
}

function entryData(
  input: LearningEntryInput,
  refs: { trackId: string | null; topicId: string | null },
) {
  return {
    date: dateKeyToDb(input.date),
    ...refs,
    title: input.title,
    contentMd: input.contentMd,
    sourceUrl: input.sourceUrl ?? null,
    confidence: input.confidence ?? null,
  };
}

export async function createLearningEntry(
  user: UserCtx,
  input: LearningEntryInput,
  now = new Date(),
): Promise<Result<LearningEntryView>> {
  const future = notInFuture(input.date, todayKey(user, now));
  if (!future.ok) return future;
  const refs = await resolveTrackTopic(user.id, input);
  if (!refs.ok) return refs;

  const review = input.scheduleReview ? initialReview(input.date) : null;
  const row = await repo.createLearningEntry(
    user.id,
    {
      ...entryData(input, refs.data),
      revisitOn: review?.revisitOn ? dateKeyToDb(review.revisitOn) : null,
      reviewStage: 0,
    },
    input.tags,
  );
  return ok(toEntryView(row));
}

/**
 * Edit an entry. Unticking "schedule revisions" clears the schedule; ticking it on an
 * unscheduled entry starts the schedule over; an already scheduled entry keeps its place.
 */
export async function updateLearningEntry(
  user: UserCtx,
  id: string,
  input: LearningEntryInput,
  now = new Date(),
): Promise<Result<LearningEntryView>> {
  const existing = await repo.findLearningEntry(user.id, id);
  if (!existing) return err("NOT_FOUND", "Entry not found.");
  const today = todayKey(user, now);
  const future = notInFuture(input.date, today);
  if (!future.ok) return future;
  const refs = await resolveTrackTopic(user.id, input);
  if (!refs.ok) return refs;

  let schedule: { revisitOn: Date | null; reviewStage: number } = {
    revisitOn: existing.revisitOn,
    reviewStage: existing.reviewStage,
  };
  if (!input.scheduleReview) {
    schedule = { revisitOn: null, reviewStage: existing.reviewStage };
  } else if (!existing.revisitOn) {
    // Count from today, so scheduling an old note doesn't make it instantly overdue.
    const start = initialReview(today);
    schedule = { revisitOn: dateKeyToDb(start.revisitOn!), reviewStage: 0 };
  }

  const row = await repo.updateLearningEntry(
    user.id,
    id,
    { ...entryData(input, refs.data), ...schedule },
    input.tags,
  );
  return row ? ok(toEntryView(row)) : err("NOT_FOUND", "Entry not found.");
}

export async function deleteLearningEntry(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteLearningEntry(userId, id))
    ? ok(null)
    : err("NOT_FOUND", "Entry not found.");
}

/** Record a revision and schedule the next one (see spaced-repetition.ts). */
export async function reviewLearningEntry(
  user: UserCtx,
  id: string,
  outcome: ReviewOutcome,
  now = new Date(),
): Promise<Result<LearningEntryView>> {
  const existing = await repo.findLearningEntry(user.id, id);
  if (!existing) return err("NOT_FOUND", "Entry not found.");
  if (!existing.revisitOn) return err("VALIDATION", "This entry isn't scheduled for revision.");

  const next = nextReview(existing.reviewStage, outcome, todayKey(user, now));
  const row = await repo.updateLearningEntry(user.id, id, {
    reviewStage: next.stage,
    revisitOn: next.revisitOn ? dateKeyToDb(next.revisitOn) : null,
    lastReviewedAt: now,
  });
  return row ? ok(toEntryView(row)) : err("NOT_FOUND", "Entry not found.");
}

// ── Pages ───────────────────────────────────────────────────────────────────

export type JournalDay = {
  dateKey: string;
  today: string;
  log: DailyLogView | null;
  entries: LearningEntryView[];
  due: LearningEntryView[];
  dueCount: number;
};

const DUE_LIST_LIMIT = 10;

export async function getJournalDay(
  user: UserCtx,
  dateKey: string,
  now = new Date(),
): Promise<JournalDay> {
  const today = todayKey(user, now);
  const dueBy = dateKeyToDb(today);
  const [log, entries, due, dueCount] = await Promise.all([
    repo.findDailyLog(user.id, dateKeyToDb(dateKey)),
    repo.listLearningEntries(user.id, { date: dateKeyToDb(dateKey) }),
    repo.listLearningEntries(user.id, { dueOnOrBefore: dueBy }, DUE_LIST_LIMIT),
    repo.countLearningEntries(user.id, { dueOnOrBefore: dueBy }),
  ]);
  return {
    dateKey,
    today,
    log: log ? toLogView(log, user.timezone) : null,
    entries: entries.map(toEntryView),
    due: due.map(toEntryView),
    dueCount,
  };
}

export const LEARNING_LIST_LIMIT = 100;

export async function listLearning(user: UserCtx, filter: LearningFilter, now = new Date()) {
  const today = todayKey(user, now);
  const [rows, tags] = await Promise.all([
    repo.listLearningEntries(
      user.id,
      {
        search: filter.q,
        tag: filter.tag,
        trackId: filter.track,
        dueOnOrBefore: filter.due ? dateKeyToDb(today) : undefined,
      },
      LEARNING_LIST_LIMIT,
    ),
    repo.listTagNames(user.id),
  ]);
  return { today, entries: rows.map(toEntryView), tags };
}

export function listTagNames(userId: string) {
  return repo.listTagNames(userId);
}
