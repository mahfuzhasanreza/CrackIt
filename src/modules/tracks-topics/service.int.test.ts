import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import {
  createTopic,
  deleteTopic,
  getRoadmap,
  moveTopic,
  setTopicStatus,
  updateTopic,
} from "./service";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
const SWE = "SWE / Full-Stack";

beforeEach(async () => {
  ctx = await createTestUser();
});

const findNode = (roadmap: Awaited<ReturnType<typeof getRoadmap>>, id: string) => {
  const stack = roadmap.flatMap((t) => t.roots);
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return n;
    stack.push(...n.children);
  }
  return undefined;
};

describe("roadmap", () => {
  it("builds the seeded tree with progress and time per topic", async () => {
    const dp = ctx.topic("Dynamic Programming");
    await setTopicStatus(ctx.user.id, dp.id, "CONFIDENT");
    await db.timeEntry.create({
      data: {
        userId: ctx.user.id,
        activityTypeId: ctx.activity("Study").id,
        trackId: dp.trackId,
        topicId: dp.id,
        startedAt: new Date("2026-11-05T03:00:00Z"),
        endedAt: new Date("2026-11-05T04:30:00Z"),
        source: "MANUAL",
      },
    });

    const roadmap = await getRoadmap(ctx.user.id, new Date("2026-11-05T05:00:00Z"));
    const swe = roadmap.find((t) => t.name === SWE)!;
    const dsa = swe.roots.find((r) => r.name === "Data Structures & Algorithms")!;
    expect(dsa.counts.CONFIDENT).toBe(1);
    expect(dsa.totalMs).toBe(90 * 60_000);
    expect(swe.summary.totalMs).toBe(90 * 60_000);
    expect(findNode(roadmap, dp.id)?.ownMs).toBe(90 * 60_000);
  });

  it("is per user", async () => {
    const other = await createTestUser();
    await setTopicStatus(other.user.id, ctx.topic("Dynamic Programming").id, "CONFIDENT");
    const roadmap = await getRoadmap(ctx.user.id);
    expect(findNode(roadmap, ctx.topic("Dynamic Programming").id)?.status).toBe("NOT_STARTED");
  });
});

describe("topic CRUD", () => {
  it("adds subtopics at the end and rejects duplicates (case-insensitive)", async () => {
    const parent = ctx.topic("Dynamic Programming");
    const a = await createTopic(ctx.user.id, {
      trackId: parent.trackId,
      parentId: parent.id,
      name: "Knapsack",
    });
    const b = await createTopic(ctx.user.id, {
      trackId: parent.trackId,
      parentId: parent.id,
      name: "LIS",
    });
    expect(a.ok && b.ok).toBe(true);
    const dup = await createTopic(ctx.user.id, {
      trackId: parent.trackId,
      parentId: parent.id,
      name: "knapsack",
    });
    expect(!dup.ok && dup.error.code).toBe("CONFLICT");

    const node = findNode(await getRoadmap(ctx.user.id), parent.id)!;
    expect(node.children.map((c) => c.name)).toEqual(["Knapsack", "LIS"]);
  });

  it("rejects a root topic that duplicates another root", async () => {
    const res = await createTopic(ctx.user.id, {
      trackId: ctx.track(SWE).id,
      name: "System Design",
    });
    expect(!res.ok && res.error.code).toBe("CONFLICT");
  });

  it("rejects a parent from another track or user", async () => {
    const res = await createTopic(ctx.user.id, {
      trackId: ctx.track("University Lecturer").id,
      parentId: ctx.topic("Dynamic Programming").id,
      name: "X",
    });
    expect(res.ok).toBe(false);
    const other = await createTestUser();
    const foreign = await createTopic(other.user.id, {
      trackId: other.track(SWE).id,
      parentId: ctx.topic("Dynamic Programming").id,
      name: "X",
    });
    expect(foreign.ok).toBe(false);
  });

  it("limits nesting depth", async () => {
    let parentId = ctx.topic("Dynamic Programming").id; // depth 1
    const trackId = ctx.track(SWE).id;
    for (const name of ["L2", "L3"]) {
      const res = await createTopic(ctx.user.id, { trackId, parentId, name });
      if (!res.ok) throw new Error(res.error.message);
      parentId = res.data.id;
    }
    const tooDeep = await createTopic(ctx.user.id, { trackId, parentId, name: "L4" });
    expect(tooDeep.ok).toBe(false);
  });

  it("renames, sets status and focus", async () => {
    const dp = ctx.topic("Dynamic Programming");
    const res = await updateTopic(ctx.user.id, {
      id: dp.id,
      name: "DP",
      status: "REVISING",
      priority: 1,
    });
    expect(res.ok).toBe(true);
    expect(await db.topic.findUnique({ where: { id: dp.id } })).toMatchObject({
      name: "DP",
      status: "REVISING",
      priority: 1,
    });
    const clash = await updateTopic(ctx.user.id, {
      id: dp.id,
      name: "Backtracking",
      status: "REVISING",
      priority: 0,
    });
    expect(!clash.ok && clash.error.code).toBe("CONFLICT");
  });

  it("moves a topic among its siblings", async () => {
    const dp = ctx.topic("Dynamic Programming");
    const before = findNode(await getRoadmap(ctx.user.id), dp.parentId!)!.children.map(
      (c) => c.name,
    );
    await moveTopic(ctx.user.id, dp.id, "up");
    const after = findNode(await getRoadmap(ctx.user.id), dp.parentId!)!.children.map(
      (c) => c.name,
    );
    const i = before.indexOf("Dynamic Programming");
    expect(after[i - 1]).toBe("Dynamic Programming");
    expect(after[i]).toBe(before[i - 1]);

    const first = after[0]!;
    const firstId = findNode(await getRoadmap(ctx.user.id), dp.parentId!)!.children[0]!.id;
    expect((await moveTopic(ctx.user.id, firstId, "up")).ok).toBe(true);
    expect(findNode(await getRoadmap(ctx.user.id), dp.parentId!)!.children[0]!.name).toBe(first);
  });

  it("deletes a subtree but keeps time entries (unlinked)", async () => {
    const dsa = ctx.topic("Data Structures & Algorithms");
    const dp = ctx.topic("Dynamic Programming");
    const entry = await db.timeEntry.create({
      data: {
        userId: ctx.user.id,
        activityTypeId: ctx.activity("Study").id,
        trackId: dp.trackId,
        topicId: dp.id,
        startedAt: new Date("2026-11-05T03:00:00Z"),
        endedAt: new Date("2026-11-05T04:00:00Z"),
        source: "MANUAL",
      },
    });
    const other = await createTestUser();
    expect((await deleteTopic(other.user.id, dsa.id)).ok).toBe(false);
    expect((await deleteTopic(ctx.user.id, dsa.id)).ok).toBe(true);
    expect(await db.topic.findUnique({ where: { id: dp.id } })).toBeNull();
    expect(await db.timeEntry.findUnique({ where: { id: entry.id } })).toMatchObject({
      topicId: null,
      trackId: dp.trackId,
    });
  });
});
