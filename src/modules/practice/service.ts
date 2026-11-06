import "server-only";

import { dateKeyToDb, dbDateToKey, logicalDateKey } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";
import { initialReview, nextReview, type ReviewOutcome } from "@/lib/spaced-repetition";

import { findOwnedTrack } from "../tracks-topics/repository";

import * as repo from "./repository";
import { scoreTrend } from "./rules";
import type { PresentationFormInput, QuestionFormInput } from "./validators";

type UserCtx = { id: string; timezone: string; dayStartHour: number };

const todayKey = (user: UserCtx, now: Date) =>
  logicalDateKey(now, user.timezone, user.dayStartHour);
const keyOrNull = (d: Date | null) => (d ? dbDateToKey(d) : null);
const notFound = (what: string) => err("NOT_FOUND", `${what} not found.`);

async function checkTrack(userId: string, trackId?: string): Promise<Result<string | null>> {
  if (!trackId) return ok(null);
  return (await findOwnedTrack(userId, trackId))
    ? ok(trackId)
    : err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
}

// ── Page data ───────────────────────────────────────────────────────────────

export async function getPracticePage(user: UserCtx, now = new Date()) {
  const today = todayKey(user, now);
  const [presentationRows, questionRows] = await Promise.all([
    repo.listPresentations(user.id),
    repo.listQuestions(user.id),
  ]);

  const presentations = presentationRows.map((p) => ({
    id: p.id,
    title: p.title,
    track: p.track,
    dateKey: dbDateToKey(p.date),
    durationMin: p.durationMin,
    audience: p.audience,
    selfScore: p.selfScore,
    feedbackMd: p.feedbackMd,
    recordingUrl: p.recordingUrl,
  }));
  const questions = questionRows.map((q) => ({
    id: q.id,
    question: q.question,
    answerMd: q.answerMd,
    track: q.track,
    nextReviewOn: keyOrNull(q.nextReviewOn),
    reviewStage: q.reviewStage,
  }));

  return {
    today,
    presentations,
    questions,
    summary: {
      trend: scoreTrend(presentations),
      presentationCount: presentations.length,
      due: questions.filter((q) => q.nextReviewOn !== null && q.nextReviewOn <= today).length,
      questionCount: questions.length,
      mastered: questions.filter((q) => q.nextReviewOn === null).length,
    },
  };
}

export type PracticePage = Awaited<ReturnType<typeof getPracticePage>>;
export type PresentationView = PracticePage["presentations"][number];
export type QuestionView = PracticePage["questions"][number];

// ── Mutations ───────────────────────────────────────────────────────────────

export async function savePresentation(
  user: UserCtx,
  input: PresentationFormInput,
  now = new Date(),
): Promise<Result<null>> {
  if (input.date > todayKey(user, now)) {
    return err("VALIDATION", "Log a presentation once it has happened.", {
      date: ["In the future"],
    });
  }
  const track = await checkTrack(user.id, input.trackId);
  if (!track.ok) return track;
  const saved = await repo.savePresentation(user.id, input.id, {
    title: input.title,
    trackId: track.data,
    date: dateKeyToDb(input.date),
    durationMin: input.durationMin,
    audience: input.audience,
    selfScore: input.selfScore ?? null,
    feedbackMd: input.feedbackMd,
    recordingUrl: input.recordingUrl ?? null,
  });
  return saved ? ok(null) : notFound("Presentation");
}

/** New questions are first practised tomorrow; edits keep the schedule. */
export async function saveQuestion(
  user: UserCtx,
  input: QuestionFormInput,
  now = new Date(),
): Promise<Result<null>> {
  const track = await checkTrack(user.id, input.trackId);
  if (!track.ok) return track;
  const base = { question: input.question, answerMd: input.answerMd, trackId: track.data };
  if (input.id) {
    const existing = await repo.findQuestion(user.id, input.id);
    if (!existing) return notFound("Question");
    await repo.saveQuestion(user.id, input.id, {
      ...base,
      nextReviewOn: existing.nextReviewOn,
      reviewStage: existing.reviewStage,
    });
    return ok(null);
  }
  const first = initialReview(todayKey(user, now));
  await repo.saveQuestion(user.id, undefined, {
    ...base,
    nextReviewOn: dateKeyToDb(first.revisitOn!),
    reviewStage: first.stage,
  });
  return ok(null);
}

/** Practise a question: remembered → next step; forgot → back tomorrow. */
export async function reviewQuestion(
  user: UserCtx,
  id: string,
  outcome: ReviewOutcome,
  now = new Date(),
): Promise<Result<{ nextReviewOn: string | null }>> {
  const existing = await repo.findQuestion(user.id, id);
  if (!existing) return notFound("Question");
  const next = nextReview(existing.reviewStage, outcome, todayKey(user, now));
  await repo.updateQuestionReview(user.id, id, {
    nextReviewOn: next.revisitOn ? dateKeyToDb(next.revisitOn) : null,
    reviewStage: next.stage,
    lastPracticedAt: now,
  });
  return ok({ nextReviewOn: next.revisitOn });
}

export async function deleteRecord(
  userId: string,
  kind: "presentation" | "question",
  id: string,
): Promise<Result<null>> {
  return (await repo.deleteRecord(userId, kind, id)) ? ok(null) : notFound("Item");
}
