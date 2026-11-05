import "server-only";

import type { ProblemDifficulty, ProblemPlatform, ProblemStatus } from "@/generated/prisma/enums";
import { dateKeyToDb, dbDateToKey, logicalDateKey } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";
import type { ReviewOutcome } from "@/lib/spaced-repetition";

import { findOwnedTopic } from "../tracks-topics/repository";

import * as repo from "./repository";
import { applyAttempt, applyManualStatus, applyReview, type ProblemState } from "./rules";
import type { ProblemFilter, ProblemFormInput } from "./validators";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

const todayKey = (user: UserCtx, now: Date) =>
  logicalDateKey(now, user.timezone, user.dayStartHour);

export type ProblemView = {
  id: string;
  title: string;
  platform: ProblemPlatform;
  url: string | null;
  difficulty: ProblemDifficulty;
  status: ProblemStatus;
  attempts: number;
  timeSpentMin: number;
  solvedAt: Date | null;
  notesMd: string;
  nextReviewOn: string | null;
  reviewStage: number;
  topic: { id: string; name: string } | null;
  tags: string[];
};

function toView(row: repo.ProblemRow): ProblemView {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    url: row.url,
    difficulty: row.difficulty,
    status: row.status,
    attempts: row.attempts,
    timeSpentMin: row.timeSpentMin,
    solvedAt: row.solvedAt,
    notesMd: row.notesMd,
    nextReviewOn: row.nextReviewOn ? dbDateToKey(row.nextReviewOn) : null,
    reviewStage: row.reviewStage,
    topic: row.topic,
    tags: row.tags.map((t) => t.tag.name),
  };
}

const stateOf = (row: repo.ProblemRow): ProblemState => ({
  status: row.status,
  attempts: row.attempts,
  timeSpentMin: row.timeSpentMin,
  solvedAt: row.solvedAt,
  nextReviewOn: row.nextReviewOn ? dbDateToKey(row.nextReviewOn) : null,
  reviewStage: row.reviewStage,
});

const stateData = (s: ProblemState) => ({
  status: s.status,
  attempts: s.attempts,
  timeSpentMin: s.timeSpentMin,
  solvedAt: s.solvedAt,
  nextReviewOn: s.nextReviewOn ? dateKeyToDb(s.nextReviewOn) : null,
  reviewStage: s.reviewStage,
});

// ── Queries ─────────────────────────────────────────────────────────────────

export type ProblemStats = {
  total: number;
  solved: Record<ProblemDifficulty, number>;
  byStatus: Record<ProblemStatus, number>;
};

export async function getProblemsPage(user: UserCtx, filter: ProblemFilter, now = new Date()) {
  const today = todayKey(user, now);
  const dueBy = dateKeyToDb(today);
  const [rows, due, counts, patterns] = await Promise.all([
    repo.listProblems(user.id, {
      search: filter.q,
      status: filter.status,
      difficulty: filter.difficulty,
      platform: filter.platform,
      tag: filter.tag,
    }),
    repo.listProblems(user.id, { dueOnOrBefore: dueBy }, 20),
    repo.problemCounts(user.id),
    repo.listPatternNames(user.id),
  ]);

  const stats: ProblemStats = {
    total: 0,
    solved: { EASY: 0, MEDIUM: 0, HARD: 0 },
    byStatus: { TODO: 0, ATTEMPTED: 0, SOLVED: 0, NEEDS_REVISION: 0 },
  };
  for (const c of counts) {
    stats.total += c._count._all;
    stats.byStatus[c.status] += c._count._all;
    if (c.status === "SOLVED" || c.status === "NEEDS_REVISION") {
      stats.solved[c.difficulty] += c._count._all;
    }
  }
  return {
    today,
    problems: rows.map(toView),
    due: due.map(toView),
    stats,
    patterns,
  };
}

export function countDueProblems(user: UserCtx, now = new Date()) {
  return repo.countDueProblems(user.id, dateKeyToDb(todayKey(user, now)));
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** Create (no `id`) or edit a problem. */
export async function saveProblem(
  user: UserCtx,
  input: ProblemFormInput,
  now = new Date(),
): Promise<Result<ProblemView>> {
  const existing = input.id ? await repo.findProblem(user.id, input.id) : null;
  if (input.id && !existing) return err("NOT_FOUND", "Problem not found.");

  if (input.topicId && !(await findOwnedTopic(user.id, input.topicId))) {
    return err("VALIDATION", "Unknown topic.", { topicId: ["Unknown topic"] });
  }
  if (input.url) {
    const dup = await repo.findProblemByUrl(user.id, input.url, input.id);
    if (dup) {
      return err("CONFLICT", `You already track this problem as “${dup.title}”.`, {
        url: ["Already tracked"],
      });
    }
  }

  const before: ProblemState = existing
    ? stateOf(existing)
    : {
        status: "TODO",
        attempts: 0,
        timeSpentMin: 0,
        solvedAt: null,
        nextReviewOn: null,
        reviewStage: 0,
      };
  const state = applyManualStatus(
    { ...before, timeSpentMin: input.timeSpentMin },
    input.status,
    input.scheduleReview,
    todayKey(user, now),
    now,
  );

  const row = await repo.saveProblem(
    user.id,
    input.id ?? null,
    {
      title: input.title,
      platform: input.platform,
      url: input.url ?? null,
      difficulty: input.difficulty,
      topicId: input.topicId ?? null,
      notesMd: input.notesMd,
      ...stateData(state),
    },
    input.tags,
  );
  return row ? ok(toView(row)) : err("NOT_FOUND", "Problem not found.");
}

export async function logAttempt(
  user: UserCtx,
  id: string,
  attempt: { minutes: number; solved: boolean },
  now = new Date(),
): Promise<Result<ProblemView>> {
  const existing = await repo.findProblem(user.id, id);
  if (!existing) return err("NOT_FOUND", "Problem not found.");
  const state = applyAttempt(stateOf(existing), attempt, todayKey(user, now), now);
  const row = await repo.saveProblem(user.id, id, stateData(state));
  return row ? ok(toView(row)) : err("NOT_FOUND", "Problem not found.");
}

export async function reviewProblem(
  user: UserCtx,
  id: string,
  outcome: ReviewOutcome,
  now = new Date(),
): Promise<Result<ProblemView>> {
  const existing = await repo.findProblem(user.id, id);
  if (!existing) return err("NOT_FOUND", "Problem not found.");
  if (!existing.nextReviewOn)
    return err("VALIDATION", "This problem isn't scheduled for revision.");
  const state = applyReview(stateOf(existing), outcome, todayKey(user, now));
  const row = await repo.saveProblem(user.id, id, { ...stateData(state), lastReviewedAt: now });
  return row ? ok(toView(row)) : err("NOT_FOUND", "Problem not found.");
}

export async function deleteProblem(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteProblem(userId, id)) ? ok(null) : err("NOT_FOUND", "Problem not found.");
}
