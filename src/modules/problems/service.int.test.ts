import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";
import { createLearningEntry, deleteLearningEntry } from "../journal/service";

import {
  countDueProblems,
  deleteProblem,
  getProblemsPage,
  logAttempt,
  reviewProblem,
  saveProblem,
} from "./service";
import type { ProblemFormInput } from "./validators";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
let user: { id: string; timezone: string; dayStartHour: number };

const on = (key: string) => new Date(`${key}T04:00:00Z`); // 10:00 Dhaka
const TODAY = "2026-11-05";

beforeEach(async () => {
  ctx = await createTestUser();
  user = { id: ctx.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
});

function form(overrides: Partial<ProblemFormInput> = {}): ProblemFormInput {
  return {
    title: "Two Sum",
    platform: "LEETCODE",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "EASY",
    status: "TODO",
    tags: ["arrays", "hashing"],
    timeSpentMin: 0,
    notesMd: "",
    scheduleReview: true,
    ...overrides,
  };
}

async function create(overrides: Partial<ProblemFormInput> = {}) {
  const res = await saveProblem(user, form(overrides), on(TODAY));
  if (!res.ok) throw new Error(res.error.message);
  return res.data;
}

describe("problems", () => {
  it("creates with patterns and a topic; rejects a duplicate link", async () => {
    const topic = ctx.topic("Arrays & Hashing");
    const p = await create({ topicId: topic.id });
    expect(p).toMatchObject({
      status: "TODO",
      tags: ["arrays", "hashing"],
      topic: { id: topic.id },
    });

    const dup = await saveProblem(
      user,
      form({ title: "Again", url: "https://LEETCODE.com/problems/two-sum/" }),
      on(TODAY),
    );
    expect(!dup.ok && dup.error.fieldErrors?.url).toBeTruthy();
    // Editing the same problem keeps its own link.
    expect((await saveProblem(user, form({ id: p.id, title: "Two Sum (I)" }), on(TODAY))).ok).toBe(
      true,
    );
  });

  it("logging attempts: attempted, then solved with a revision tomorrow", async () => {
    const p = await create();
    const a1 = await logAttempt(user, p.id, { minutes: 30, solved: false }, on(TODAY));
    expect(a1.ok && a1.data).toMatchObject({ status: "ATTEMPTED", attempts: 1, timeSpentMin: 30 });
    const a2 = await logAttempt(user, p.id, { minutes: 15, solved: true }, on(TODAY));
    expect(a2.ok && a2.data).toMatchObject({
      status: "SOLVED",
      attempts: 2,
      timeSpentMin: 45,
      nextReviewOn: "2026-11-06",
    });
  });

  it("revision queue: due problems, remembered and forgot", async () => {
    const p = await create({ status: "SOLVED" }); // revisit 11-06
    expect(await countDueProblems(user, on(TODAY))).toBe(0);
    expect(await countDueProblems(user, on("2026-11-06"))).toBe(1);

    const page = await getProblemsPage(user, {}, on("2026-11-06"));
    expect(page.due.map((d) => d.id)).toEqual([p.id]);

    const r = await reviewProblem(user, p.id, "remembered", on("2026-11-06"));
    expect(r.ok && r.data).toMatchObject({ reviewStage: 1, nextReviewOn: "2026-11-09" });
    const f = await reviewProblem(user, p.id, "forgot", on("2026-11-09"));
    expect(f.ok && f.data).toMatchObject({ status: "NEEDS_REVISION", nextReviewOn: "2026-11-10" });
  });

  it("filters and stats", async () => {
    await create({ title: "Two Sum", status: "SOLVED" });
    await create({
      title: "Course Schedule",
      url: "https://leetcode.com/problems/course-schedule/",
      difficulty: "MEDIUM",
      tags: ["graphs", "topological sort"],
    });
    await create({ title: "Watermelon", platform: "CODEFORCES", url: undefined, tags: [] });

    const all = await getProblemsPage(user, {}, on(TODAY));
    expect(all.stats).toMatchObject({
      total: 3,
      solved: { EASY: 1, MEDIUM: 0, HARD: 0 },
      byStatus: { TODO: 2, SOLVED: 1 },
    });
    expect(all.patterns).toEqual(["arrays", "graphs", "hashing", "topological sort"]);

    const t = async (f: Parameters<typeof getProblemsPage>[1]) =>
      (await getProblemsPage(user, f, on(TODAY))).problems.map((p) => p.title).sort();
    expect(await t({ tag: "graphs" })).toEqual(["Course Schedule"]);
    expect(await t({ difficulty: "MEDIUM" })).toEqual(["Course Schedule"]);
    expect(await t({ platform: "CODEFORCES" })).toEqual(["Watermelon"]);
    expect(await t({ q: "two" })).toEqual(["Two Sum"]);
    expect(await t({ status: "TODO" })).toEqual(["Course Schedule", "Watermelon"]);
  });

  it("tags shared with learning notes survive until neither uses them", async () => {
    const p = await create({ tags: ["graphs"] });
    const note = await createLearningEntry(
      user,
      { date: TODAY, title: "BFS", contentMd: "", tags: ["graphs"], scheduleReview: false },
      on(TODAY),
    );
    if (!note.ok) throw new Error(note.error.message);

    await deleteProblem(user.id, p.id);
    expect(await db.tag.count({ where: { userId: user.id, name: "graphs" } })).toBe(1);
    await deleteLearningEntry(user.id, note.data.id);
    expect(await db.tag.count({ where: { userId: user.id } })).toBe(0);
  });

  it("is per user", async () => {
    const p = await create();
    const other = await createTestUser();
    const o = { id: other.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
    expect((await logAttempt(o, p.id, { minutes: 1, solved: true })).ok).toBe(false);
    expect((await saveProblem(o, form({ id: p.id }))).ok).toBe(false);
    expect((await deleteProblem(other.user.id, p.id)).ok).toBe(false);
    expect((await getProblemsPage(o, {})).problems).toEqual([]);
    // Same link is fine for a different user.
    expect((await saveProblem(o, form())).ok).toBe(true);
  });

  it("the database requires solved_at for solved problems", async () => {
    await expect(
      db.problem.create({ data: { userId: user.id, title: "x", status: "SOLVED" } }),
    ).rejects.toThrow();
  });
});
