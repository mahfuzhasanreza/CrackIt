import "server-only";

import { dayWindow } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { type DaySummary, type Segment, clipToWindow, summarizeDay } from "./day-summary";
import * as repo from "./repository";
import type { TimeEntryView, Tx } from "./repository";
import type { EntryInput, StartTimerInput, StopTimerInput } from "./validators";

export type { TimeEntryView };

/** Allow small client/server clock differences when checking "not in the future". */
const CLOCK_SKEW_MS = 60_000;
const MAX_ENTRY_MS = 24 * 60 * 60 * 1000;

type Refs = { activityTypeId: string; trackId?: string; topicId?: string };
type ResolvedRefs = { activityTypeId: string; trackId: string | null; topicId: string | null };

/**
 * Check the user owns every referenced row, derive the track from the topic,
 * and require a track for study activities.
 */
async function resolveRefs(
  userId: string,
  refs: Refs,
  opts: { allowArchived?: boolean } = {},
  client?: Tx,
): Promise<Result<ResolvedRefs>> {
  const activity = await repo.findActivityType(userId, refs.activityTypeId, client);
  if (!activity)
    return err("VALIDATION", "Unknown activity.", { activityTypeId: ["Unknown activity"] });
  if (activity.isArchived && !opts.allowArchived) {
    return err("VALIDATION", "That activity is archived.", { activityTypeId: ["Archived"] });
  }

  let trackId = refs.trackId ?? null;
  const topicId = refs.topicId ?? null;
  if (trackId && !(await repo.findTrack(userId, trackId, client))) {
    return err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
  }
  if (topicId) {
    const topic = await repo.findTopic(userId, topicId, client);
    if (!topic) return err("VALIDATION", "Unknown topic.", { topicId: ["Unknown topic"] });
    if (trackId && topic.trackId !== trackId) {
      return err("VALIDATION", "That topic belongs to a different track.", {
        topicId: ["Topic is not in the selected track"],
      });
    }
    trackId = topic.trackId;
  }

  if (activity.category === "STUDY" && !trackId) {
    return err("VALIDATION", "Pick a track for study time.", { trackId: ["Required for study"] });
  }
  return ok({ activityTypeId: activity.id, trackId, topicId });
}

/** Rules for a closed or running interval. Pure. */
export function validateInterval(startedAt: Date, endedAt: Date | null, now: Date): Result<null> {
  const latest = now.getTime() + CLOCK_SKEW_MS;
  if (startedAt.getTime() > latest) {
    return err("VALIDATION", "Start can't be in the future.", { startedAt: ["In the future"] });
  }
  if (endedAt) {
    if (endedAt <= startedAt) {
      return err("VALIDATION", "End must be after start.", { endedAt: ["Must be after start"] });
    }
    if (endedAt.getTime() > latest) {
      return err("VALIDATION", "End can't be in the future.", { endedAt: ["In the future"] });
    }
    if (endedAt.getTime() - startedAt.getTime() > MAX_ENTRY_MS) {
      return err("VALIDATION", "An entry can't be longer than 24 hours.", {
        endedAt: ["Longer than 24 hours"],
      });
    }
  }
  return ok(null);
}

function overlapError(conflicts: TimeEntryView[]): Result<never> {
  const names = conflicts.slice(0, 3).map((c) => c.activityType.name);
  return err(
    "CONFLICT",
    `Overlaps ${conflicts.length === 1 ? "an existing entry" : `${conflicts.length} entries`} (${names.join(", ")}). Adjust the times or edit the other entry first.`,
  );
}

function mapDbError(error: unknown): Result<never> {
  const constraint = repo.violatedConstraint(error);
  if (constraint === "time_entries_one_running_per_user") {
    return err("CONFLICT", "A timer is already running.");
  }
  if (constraint === "time_entries_no_overlap") {
    return err("CONFLICT", "That time overlaps another entry.");
  }
  throw error;
}

const sameRefs = (e: TimeEntryView, r: ResolvedRefs) =>
  e.activityTypeId === r.activityTypeId && e.trackId === r.trackId && e.topicId === r.topicId;

// ── Timer ───────────────────────────────────────────────────────────────────

export function getRunningEntry(userId: string) {
  return repo.findRunningEntry(userId);
}

/**
 * Start a timer. If another is running it is stopped at the same instant (a "switch").
 * Starting the exact same activity/track/topic again is a no-op.
 */
export async function startTimer(
  userId: string,
  input: StartTimerInput,
  now = new Date(),
): Promise<Result<TimeEntryView>> {
  try {
    return await repo.inTransaction(async (tx) => {
      const refs = await resolveRefs(userId, input, {}, tx);
      if (!refs.ok) return refs;

      const running = await repo.findRunningEntry(userId, tx);
      if (running && sameRefs(running, refs.data)) return ok(running);

      let startAt = now;
      if (running) {
        // Guard against a clock earlier than the running start (e.g. edited start time).
        const stopAt = now > running.startedAt ? now : new Date(running.startedAt.getTime() + 1000);
        await repo.updateEntry(userId, running.id, { endedAt: stopAt }, tx);
        startAt = stopAt;
      }
      const entry = await repo.createEntry(
        {
          userId,
          ...refs.data,
          startedAt: startAt,
          endedAt: null,
          source: "TIMER",
          note: input.note,
        },
        tx,
      );
      return ok(entry);
    });
  } catch (error) {
    return mapDbError(error);
  }
}

export async function stopTimer(
  userId: string,
  input: StopTimerInput,
  now = new Date(),
): Promise<Result<TimeEntryView>> {
  const running = await repo.findRunningEntry(userId);
  if (!running) return err("NOT_FOUND", "No timer is running.");
  const endedAt = now > running.startedAt ? now : new Date(running.startedAt.getTime() + 1000);
  const updated = await repo.updateEntry(userId, running.id, {
    endedAt,
    focusRating: input.focusRating ?? running.focusRating,
    note: input.note ?? running.note,
  });
  return updated ? ok(updated) : err("NOT_FOUND", "No timer is running.");
}

// ── Manual entries ──────────────────────────────────────────────────────────

export async function createManualEntry(
  userId: string,
  input: EntryInput,
  now = new Date(),
): Promise<Result<TimeEntryView>> {
  if (!input.endedAt) {
    return err("VALIDATION", "Manual entries need an end time. Use the timer for live tracking.", {
      endedAt: ["Required"],
    });
  }
  const interval = validateInterval(input.startedAt, input.endedAt, now);
  if (!interval.ok) return interval;
  const refs = await resolveRefs(userId, input);
  if (!refs.ok) return refs;

  const conflicts = await repo.findOverlapping(userId, {
    start: input.startedAt,
    end: input.endedAt,
  });
  if (conflicts.length) return overlapError(conflicts);

  try {
    const entry = await repo.createEntry({
      userId,
      ...refs.data,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      source: "MANUAL",
      note: input.note,
      focusRating: input.focusRating,
    });
    return ok(entry);
  } catch (error) {
    return mapDbError(error);
  }
}

export async function updateTimeEntry(
  userId: string,
  id: string,
  input: EntryInput,
  now = new Date(),
): Promise<Result<TimeEntryView>> {
  const existing = await repo.findEntry(userId, id);
  if (!existing) return err("NOT_FOUND", "Entry not found.");

  // Only the running entry may stay open; a closed entry can't be "re-opened".
  if (!input.endedAt && existing.endedAt) {
    return err("VALIDATION", "End time is required.", { endedAt: ["Required"] });
  }
  const interval = validateInterval(input.startedAt, input.endedAt, now);
  if (!interval.ok) return interval;
  const refs = await resolveRefs(userId, input, {
    allowArchived: input.activityTypeId === existing.activityTypeId,
  });
  if (!refs.ok) return refs;

  const conflicts = await repo.findOverlapping(
    userId,
    { start: input.startedAt, end: input.endedAt },
    id,
  );
  if (conflicts.length) return overlapError(conflicts);

  try {
    const entry = await repo.updateEntry(userId, id, {
      ...refs.data,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      note: input.note ?? null,
      focusRating: input.focusRating ?? null,
    });
    return entry ? ok(entry) : err("NOT_FOUND", "Entry not found.");
  } catch (error) {
    return mapDbError(error);
  }
}

export async function deleteTimeEntry(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteEntry(userId, id)) ? ok(null) : err("NOT_FOUND", "Entry not found.");
}

// ── Day view ────────────────────────────────────────────────────────────────

export type DayView = {
  dateKey: string;
  window: { start: Date; end: Date };
  now: Date;
  entries: TimeEntryView[];
  segments: Segment[];
  summary: DaySummary;
};

export async function getDay(
  user: { id: string; timezone: string; dayStartHour: number },
  dateKey: string,
  now = new Date(),
): Promise<DayView> {
  const window = dayWindow(dateKey, user.timezone, user.dayStartHour);
  const entries = await repo.listEntriesBetween(user.id, window.start, window.end);
  const summaryEntries = entries.map((e) => ({
    id: e.id,
    startedAt: e.startedAt,
    endedAt: e.endedAt,
    category: e.activityType.category,
    isProductive: e.activityType.isProductive,
    trackId: e.trackId,
  }));
  return {
    dateKey,
    window,
    now,
    entries,
    segments: clipToWindow(summaryEntries, window, now),
    summary: summarizeDay(summaryEntries, window, now),
  };
}
