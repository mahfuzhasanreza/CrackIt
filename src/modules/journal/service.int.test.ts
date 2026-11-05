import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import {
  createLearningEntry,
  deleteLearningEntry,
  getJournalDay,
  listLearning,
  reviewLearningEntry,
  saveDailyLog,
  updateLearningEntry,
} from "./service";
import type { LearningEntryInput } from "./validators";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
let user: { id: string; timezone: string; dayStartHour: number };

// 2026-11-05 10:00 in Dhaka (UTC+6) → logical day 2026-11-05.
const NOW = new Date("2026-11-05T04:00:00Z");

beforeEach(async () => {
  ctx = await createTestUser();
  user = { id: ctx.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
});

function entry(overrides: Partial<LearningEntryInput> = {}): LearningEntryInput {
  return {
    date: "2026-11-05",
    title: "Dijkstra",
    contentMd: "Use a **min-heap**.",
    tags: ["graphs"],
    scheduleReview: true,
    ...overrides,
  };
}

describe("daily log", () => {
  it("creates, then overwrites the day's log, clearing omitted fields", async () => {
    const first = await saveDailyLog(
      user,
      { date: "2026-11-05", mood: 4, bedTime: "23:30", wakeTime: "07:00", wins: "Solved 3" },
      NOW,
    );
    expect(first.ok && first.data).toMatchObject({
      mood: 4,
      bedTime: "23:30",
      wakeTime: "07:00",
      sleepMs: 7.5 * 3600_000,
      wins: "Solved 3",
    });

    const second = await saveDailyLog(user, { date: "2026-11-05", energy: 2 }, NOW);
    expect(second.ok && second.data).toMatchObject({ mood: null, energy: 2, wins: null });
    expect(await db.dailyLog.count({ where: { userId: user.id } })).toBe(1);

    const day = await getJournalDay(user, "2026-11-05", NOW);
    expect(day.log?.energy).toBe(2);
  });

  it("allows planning tomorrow but not further", async () => {
    expect((await saveDailyLog(user, { date: "2026-11-06" }, NOW)).ok).toBe(true);
    const far = await saveDailyLog(user, { date: "2026-11-07" }, NOW);
    expect(!far.ok && far.error.fieldErrors?.date).toBeTruthy();
  });

  it("rejects a wake-up before bedtime", async () => {
    const res = await saveDailyLog(
      user,
      { date: "2026-11-05", bedTime: "09:00", wakeTime: "08:00" },
      NOW,
    );
    expect(!res.ok && res.error.fieldErrors?.wakeTime).toBeTruthy();
  });

  it("is per user", async () => {
    const other = await createTestUser();
    await saveDailyLog(user, { date: "2026-11-05", mood: 5 }, NOW);
    const day = await getJournalDay(
      { id: other.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 },
      "2026-11-05",
      NOW,
    );
    expect(day.log).toBeNull();
  });
});

describe("learning entries", () => {
  it("creates with tags, a topic-derived track and a first revision tomorrow", async () => {
    const topic = ctx.topic("Dynamic Programming");
    const res = await createLearningEntry(
      user,
      entry({ topicId: topic.id, tags: ["dp", "graphs"] }),
      NOW,
    );
    expect(res.ok && res.data).toMatchObject({
      dateKey: "2026-11-05",
      track: { id: topic.trackId },
      topic: { id: topic.id },
      tags: ["dp", "graphs"],
      revisitOn: "2026-11-06",
      reviewStage: 0,
    });
  });

  it("rejects future days and other users' tracks", async () => {
    const future = await createLearningEntry(user, entry({ date: "2026-11-06" }), NOW);
    expect(!future.ok && future.error.fieldErrors?.date).toBeTruthy();

    const other = await createTestUser();
    const foreign = await createLearningEntry(
      user,
      entry({ trackId: other.track("SWE / Full-Stack").id }),
      NOW,
    );
    expect(!foreign.ok && foreign.error.fieldErrors?.trackId).toBeTruthy();
  });

  it("rejects a topic from a different track", async () => {
    const res = await createLearningEntry(
      user,
      entry({
        trackId: ctx.track("University Lecturer").id,
        topicId: ctx.topic("Dynamic Programming").id,
      }),
      NOW,
    );
    expect(!res.ok && res.error.fieldErrors?.topicId).toBeTruthy();
  });

  it("updates tags and removes tags nobody uses any more", async () => {
    const created = await createLearningEntry(user, entry({ tags: ["graphs", "heap"] }), NOW);
    if (!created.ok) throw new Error("create failed");
    const updated = await updateLearningEntry(
      user,
      created.data.id,
      entry({ title: "Dijkstra's algorithm", tags: ["graphs"] }),
      NOW,
    );
    expect(updated.ok && updated.data).toMatchObject({
      title: "Dijkstra's algorithm",
      tags: ["graphs"],
    });
    const tags = await db.tag.findMany({ where: { userId: user.id }, select: { name: true } });
    expect(tags.map((t) => t.name)).toEqual(["graphs"]);
  });

  it("unticking the schedule clears it; re-ticking restarts from tomorrow", async () => {
    const created = await createLearningEntry(user, entry(), NOW);
    if (!created.ok) throw new Error("create failed");
    const off = await updateLearningEntry(
      user,
      created.data.id,
      entry({ scheduleReview: false }),
      NOW,
    );
    expect(off.ok && off.data.revisitOn).toBeNull();

    const later = new Date("2026-11-20T04:00:00Z");
    const on = await updateLearningEntry(user, created.data.id, entry(), later);
    expect(on.ok && on.data).toMatchObject({ revisitOn: "2026-11-21", reviewStage: 0 });
  });

  it("reviews walk the schedule and forgetting resets it", async () => {
    const created = await createLearningEntry(user, entry(), NOW);
    if (!created.ok) throw new Error("create failed");
    const id = created.data.id;

    const r1 = await reviewLearningEntry(user, id, "remembered", new Date("2026-11-06T04:00:00Z"));
    expect(r1.ok && r1.data).toMatchObject({ reviewStage: 1, revisitOn: "2026-11-09" });

    const r2 = await reviewLearningEntry(user, id, "forgot", new Date("2026-11-09T04:00:00Z"));
    expect(r2.ok && r2.data).toMatchObject({ reviewStage: 0, revisitOn: "2026-11-10" });
    expect(r2.ok && r2.data.lastReviewedAt).toEqual(new Date("2026-11-09T04:00:00Z"));
  });

  it("can't review an unscheduled entry", async () => {
    const created = await createLearningEntry(user, entry({ scheduleReview: false }), NOW);
    if (!created.ok) throw new Error("create failed");
    expect((await reviewLearningEntry(user, created.data.id, "remembered", NOW)).ok).toBe(false);
  });

  it("lists due entries on the journal day and filters the learning log", async () => {
    await createLearningEntry(user, entry({ date: "2026-11-03", title: "Old heap note" }), NOW);
    await createLearningEntry(
      user,
      entry({ title: "Viva prep", contentMd: "Explain *Big-O*", tags: ["lecturer"] }),
      NOW,
    );

    const day = await getJournalDay(user, "2026-11-05", NOW);
    expect(day.entries.map((e) => e.title)).toEqual(["Viva prep"]);
    expect(day.due.map((e) => e.title)).toEqual(["Old heap note"]); // due 11-04, overdue
    expect(day.dueCount).toBe(1);

    const search = await listLearning(user, { q: "big-o", due: false }, NOW);
    expect(search.entries.map((e) => e.title)).toEqual(["Viva prep"]);
    const byTag = await listLearning(user, { tag: "graphs", due: false }, NOW);
    expect(byTag.entries.map((e) => e.title)).toEqual(["Old heap note"]);
    expect(byTag.tags).toEqual(["graphs", "lecturer"]);
    const due = await listLearning(user, { due: true }, NOW);
    expect(due.entries.map((e) => e.title)).toEqual(["Old heap note"]);
  });

  it("deletes only the owner's entry", async () => {
    const created = await createLearningEntry(user, entry(), NOW);
    if (!created.ok) throw new Error("create failed");
    const other = await createTestUser();
    expect((await deleteLearningEntry(other.user.id, created.data.id)).ok).toBe(false);
    expect((await deleteLearningEntry(user.id, created.data.id)).ok).toBe(true);
    expect(await db.tag.count({ where: { userId: user.id } })).toBe(0);
  });

  it("database rejects out-of-range ratings even if the service is bypassed", async () => {
    await expect(
      db.learningEntry.create({
        data: { userId: user.id, date: new Date("2026-11-05"), title: "x", confidence: 9 },
      }),
    ).rejects.toThrow();
  });
});
