import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import { deleteResource, getResourcesPage, logProgress, saveResource, setStatus } from "./service";
import { resourceFormSchema } from "./validators";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
let user: Ctx["user"];
const now = new Date("2026-11-08T08:00:00Z"); // 14:00 in Dhaka → day 2026-11-08

beforeEach(async () => {
  ctx = await createTestUser();
  user = ctx.user;
});

const form = (overrides: Record<string, unknown> = {}) =>
  resourceFormSchema.parse({
    title: "Grokking Algorithms",
    type: "BOOK",
    status: "PLANNED",
    totalUnits: "3",
    ...overrides,
  });

async function only() {
  const page = await getResourcesPage(user, now);
  expect(page.resources).toHaveLength(1);
  return page.resources[0]!;
}

describe("resources", () => {
  it("adds a resource with a track and default unit label", async () => {
    const track = ctx.track("SWE / Full-Stack");
    expect((await saveResource(user, form({ trackId: track.id }), now)).ok).toBe(true);
    expect(await only()).toMatchObject({
      status: "PLANNED",
      unit: "chapters",
      progress: 0,
      startedOn: null,
      track: { id: track.id },
    });
  });

  it("+1 starts it, reaching the total finishes it, a step back re-opens it", async () => {
    await saveResource(user, form(), now);
    const { id } = await only();

    expect(await logProgress(user, { id, step: 1 }, now)).toEqual({
      ok: true,
      data: { status: "IN_PROGRESS" },
    });
    expect(await only()).toMatchObject({ completedUnits: 1, startedOn: "2026-11-08" });

    await logProgress(user, { id, completed: 3 }, now);
    expect(await only()).toMatchObject({ status: "DONE", progress: 1, finishedOn: "2026-11-08" });

    const over = await logProgress(user, { id, step: 1 }, now);
    expect(over.ok).toBe(false);

    await logProgress(user, { id, step: -1 }, now);
    expect(await only()).toMatchObject({
      status: "IN_PROGRESS",
      completedUnits: 2,
      finishedOn: null,
    });
  });

  it("marking done in the form fills progress; rating is kept only once finished", async () => {
    await saveResource(user, form({ rating: "5" }), now);
    const r = await only();
    expect(r.rating).toBeNull();

    await saveResource(
      user,
      form({ id: r.id, status: "DONE", completedUnits: "1", rating: "4" }),
      now,
    );
    expect(await only()).toMatchObject({ status: "DONE", completedUnits: 3, rating: 4 });
  });

  it("quick status: done fills progress, drop keeps it, planned forgets the start", async () => {
    await saveResource(user, form({ completedUnits: "1" }), now);
    const { id } = await only();
    await setStatus(user, { id, status: "DROPPED" }, now);
    expect(await only()).toMatchObject({
      status: "DROPPED",
      completedUnits: 1,
      startedOn: "2026-11-08",
    });
    await setStatus(user, { id, status: "DONE" }, now);
    expect(await only()).toMatchObject({
      status: "DONE",
      completedUnits: 3,
      finishedOn: "2026-11-08",
    });
    await setStatus(user, { id, status: "PLANNED" }, now);
    expect(await only()).toMatchObject({ status: "PLANNED", startedOn: null, finishedOn: null });
    expect((await setStatus((await createTestUser()).user, { id, status: "DONE" }, now)).ok).toBe(
      false,
    );
  });

  it("open-ended resources count without a total", async () => {
    await saveResource(user, form({ type: "SHEET", totalUnits: "", title: "Blind 75" }), now);
    const { id } = await only();
    await logProgress(user, { id, completed: 40 }, now);
    expect(await only()).toMatchObject({
      status: "IN_PROGRESS",
      completedUnits: 40,
      progress: null,
      unit: "problems",
    });
  });

  it("the database rejects inconsistent rows", async () => {
    await saveResource(user, form(), now);
    const { id } = await only();
    await expect(
      db.resource.update({ where: { id }, data: { completedUnits: 4 } }),
    ).rejects.toThrow();
    await expect(db.resource.update({ where: { id }, data: { status: "DONE" } })).rejects.toThrow();
    await expect(
      db.resource.update({ where: { id }, data: { status: "IN_PROGRESS" } }),
    ).rejects.toThrow();
  });

  it("is scoped to the owner and rejects someone else's track", async () => {
    await saveResource(user, form(), now);
    const { id } = await only();
    const other = await createTestUser();

    expect((await logProgress(other.user, { id, step: 1 }, now)).ok).toBe(false);
    expect((await saveResource(other.user, form({ id }), now)).ok).toBe(false);
    expect((await deleteResource(other.user.id, id)).ok).toBe(false);
    expect(
      (await saveResource(other.user, form({ trackId: ctx.track("SWE / Full-Stack").id }), now)).ok,
    ).toBe(false);

    expect((await deleteResource(user.id, id)).ok).toBe(true);
    expect((await getResourcesPage(user, now)).resources).toEqual([]);
  });
});
