import { beforeEach, describe, expect, it } from "vitest";

import { createTestUser } from "../../../test/factories";

import {
  deleteRecord,
  getPracticePage,
  reviewQuestion,
  savePresentation,
  saveQuestion,
} from "./service";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
let user: { id: string; timezone: string; dayStartHour: number };
const on = (key: string) => new Date(`${key}T04:00:00Z`); // 10:00 Dhaka
const TODAY = "2026-11-05";

beforeEach(async () => {
  ctx = await createTestUser();
  user = { id: ctx.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
});

describe("presentations", () => {
  it("logs presentations for a track, rejects future dates and computes the trend", async () => {
    const swe = ctx.track("SWE / Full-Stack").id;
    for (const [date, score] of [
      ["2026-11-01", 2],
      ["2026-11-03", 4],
    ] as const) {
      const res = await savePresentation(
        user,
        {
          title: "Project walkthrough",
          trackId: swe,
          date,
          durationMin: 15,
          audience: "RECORDED",
          selfScore: score,
          feedbackMd: "",
        },
        on(TODAY),
      );
      expect(res.ok).toBe(true);
    }
    const future = await savePresentation(
      user,
      { title: "x", date: "2026-11-06", durationMin: 10, audience: "LIVE", feedbackMd: "" },
      on(TODAY),
    );
    expect(!future.ok && future.error.fieldErrors?.date).toBeTruthy();

    const page = await getPracticePage(user, on(TODAY));
    expect(page.presentations.map((p) => p.dateKey)).toEqual(["2026-11-03", "2026-11-01"]);
    expect(page.presentations[0]!.track?.name).toBe("SWE / Full-Stack");
    expect(page.summary.trend).toEqual({ recent: 3, previous: null, count: 2 });
  });
});

describe("question bank", () => {
  it("schedules tomorrow, keeps the schedule on edit, and follows remembered / forgot", async () => {
    const lecturer = ctx.track("University Lecturer").id;
    expect(
      (
        await saveQuestion(
          user,
          { question: "What is a stable sort?", trackId: lecturer, answerMd: "" },
          on(TODAY),
        )
      ).ok,
    ).toBe(true);
    let [q] = (await getPracticePage(user, on(TODAY))).questions;
    expect(q).toMatchObject({
      nextReviewOn: "2026-11-06",
      reviewStage: 0,
      track: { id: lecturer },
    });

    await saveQuestion(
      user,
      { id: q!.id, question: "What is a stable sort? (edited)", answerMd: "x" },
      on("2026-11-06"),
    );
    [q] = (await getPracticePage(user, on(TODAY))).questions;
    expect(q).toMatchObject({ nextReviewOn: "2026-11-06", track: null });

    expect((await getPracticePage(user, on("2026-11-06"))).summary.due).toBe(1);
    const remembered = await reviewQuestion(user, q!.id, "remembered", on("2026-11-06"));
    expect(remembered.ok && remembered.data.nextReviewOn).toBe("2026-11-09");
    const forgot = await reviewQuestion(user, q!.id, "forgot", on("2026-11-09"));
    expect(forgot.ok && forgot.data.nextReviewOn).toBe("2026-11-10");
  });

  it("is private to its owner and rejects someone else's track", async () => {
    await saveQuestion(user, { question: "Q", answerMd: "" }, on(TODAY));
    const [q] = (await getPracticePage(user, on(TODAY))).questions;
    const other = await createTestUser();
    const otherUser = { ...user, id: other.user.id };
    expect((await reviewQuestion(otherUser, q!.id, "remembered")).ok).toBe(false);
    expect((await deleteRecord(other.user.id, "question", q!.id)).ok).toBe(false);
    expect(
      (
        await saveQuestion(otherUser, {
          question: "Q",
          trackId: ctx.track("SWE / Full-Stack").id,
          answerMd: "",
        })
      ).ok,
    ).toBe(false);
    expect((await deleteRecord(user.id, "question", q!.id)).ok).toBe(true);
    expect((await getPracticePage(user, on(TODAY))).questions).toEqual([]);
  });
});
