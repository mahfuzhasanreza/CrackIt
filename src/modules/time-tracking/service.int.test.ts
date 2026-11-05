import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import {
  createManualEntry,
  deleteTimeEntry,
  getDay,
  getRunningEntry,
  startTimer,
  stopTimer,
  updateTimeEntry,
} from "./service";

const at = (iso: string) => new Date(iso);
type Ctx = Awaited<ReturnType<typeof createTestUser>>;

let ctx: Ctx;
let studyRefs: { activityTypeId: string; trackId: string };

beforeEach(async () => {
  ctx = await createTestUser();
  studyRefs = {
    activityTypeId: ctx.activity("Study").id,
    trackId: ctx.track("SWE / Full-Stack").id,
  };
});

function manual(
  start: string,
  end: string | null,
  refs: object = { activityTypeId: ctx.activity("Break / Gap").id },
) {
  return { ...refs, startedAt: at(start), endedAt: end ? at(end) : null } as Parameters<
    typeof createManualEntry
  >[1];
}

describe("timer", () => {
  it("starts, reports running, and stops with a focus rating", async () => {
    const started = await startTimer(ctx.user.id, studyRefs, at("2026-11-05T03:00:00Z"));
    expect(started.ok).toBe(true);
    expect((await getRunningEntry(ctx.user.id))?.id).toBe(started.ok && started.data.id);

    const stopped = await stopTimer(ctx.user.id, { focusRating: 4 }, at("2026-11-05T04:30:00Z"));
    expect(stopped.ok && stopped.data).toMatchObject({
      endedAt: at("2026-11-05T04:30:00Z"),
      focusRating: 4,
    });
    expect(await getRunningEntry(ctx.user.id)).toBeNull();
  });

  it("switching activity stops the running entry at the same instant", async () => {
    await startTimer(ctx.user.id, studyRefs, at("2026-11-05T03:00:00Z"));
    const brk = await startTimer(
      ctx.user.id,
      { activityTypeId: ctx.activity("Break / Gap").id },
      at("2026-11-05T04:00:00Z"),
    );
    expect(brk.ok).toBe(true);
    const entries = await db.timeEntry.findMany({
      where: { userId: ctx.user.id },
      orderBy: { startedAt: "asc" },
    });
    expect(entries).toHaveLength(2);
    expect(entries[0]!.endedAt).toEqual(at("2026-11-05T04:00:00Z"));
    expect(entries[1]).toMatchObject({ startedAt: at("2026-11-05T04:00:00Z"), endedAt: null });
  });

  it("starting the same activity again is a no-op", async () => {
    const a = await startTimer(ctx.user.id, studyRefs, at("2026-11-05T03:00:00Z"));
    const b = await startTimer(ctx.user.id, studyRefs, at("2026-11-05T03:10:00Z"));
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
  });

  it("derives the track from the topic and rejects mismatches", async () => {
    const graphs = ctx.topic("Graphs (BFS, DFS, Topological Sort)");
    const r = await startTimer(
      ctx.user.id,
      { activityTypeId: ctx.activity("Study").id, topicId: graphs.id },
      at("2026-11-05T03:00:00Z"),
    );
    expect(r.ok && r.data.trackId).toBe(graphs.trackId);

    const bad = await startTimer(
      ctx.user.id,
      {
        activityTypeId: ctx.activity("Study").id,
        trackId: ctx.track("University Lecturer").id,
        topicId: graphs.id,
      },
      at("2026-11-05T04:00:00Z"),
    );
    expect(!bad.ok && bad.error.code).toBe("VALIDATION");
  });

  it("requires a track for study activities", async () => {
    const r = await startTimer(ctx.user.id, { activityTypeId: ctx.activity("Study").id });
    expect(!r.ok && r.error.fieldErrors?.trackId).toBeTruthy();
  });

  it("rejects references owned by another user", async () => {
    const other = await createTestUser();
    const r = await startTimer(ctx.user.id, { activityTypeId: other.activity("Sleep").id });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });

  it("stopping with nothing running is NOT_FOUND", async () => {
    const r = await stopTimer(ctx.user.id, {});
    expect(!r.ok && r.error.code).toBe("NOT_FOUND");
  });
});

describe("manual entries", () => {
  const now = at("2026-11-05T12:00:00Z");

  it("creates a closed entry", async () => {
    const r = await createManualEntry(
      ctx.user.id,
      manual("2026-11-04T16:00:00Z", "2026-11-05T00:00:00Z", {
        activityTypeId: ctx.activity("Sleep").id,
      }),
      now,
    );
    expect(r.ok && r.data).toMatchObject({ source: "MANUAL", trackId: null });
  });

  it("rejects overlaps with a helpful message, but allows touching entries", async () => {
    await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T05:00:00Z", "2026-11-05T06:00:00Z"),
      now,
    );
    const overlap = await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T05:30:00Z", "2026-11-05T07:00:00Z"),
      now,
    );
    expect(!overlap.ok && overlap.error).toMatchObject({ code: "CONFLICT" });
    expect(!overlap.ok && overlap.error.message).toContain("Break / Gap");

    const touching = await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T06:00:00Z", "2026-11-05T07:00:00Z"),
      now,
    );
    expect(touching.ok).toBe(true);
  });

  it("rejects entries overlapping the running timer", async () => {
    await startTimer(ctx.user.id, studyRefs, at("2026-11-05T10:00:00Z"));
    const r = await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T09:30:00Z", "2026-11-05T10:30:00Z"),
      now,
    );
    expect(!r.ok && r.error.code).toBe("CONFLICT");
  });

  it.each([
    ["end before start", "2026-11-05T06:00:00Z", "2026-11-05T05:00:00Z"],
    ["in the future", "2026-11-05T11:00:00Z", "2026-11-05T13:00:00Z"],
    ["longer than 24h", "2026-11-03T10:00:00Z", "2026-11-04T10:30:00Z"],
  ])("rejects %s", async (_label, start, end) => {
    const r = await createManualEntry(ctx.user.id, manual(start, end), now);
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });

  it("updates times and refs, and refuses to overlap a neighbour", async () => {
    const a = await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T05:00:00Z", "2026-11-05T06:00:00Z"),
      now,
    );
    await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T07:00:00Z", "2026-11-05T08:00:00Z"),
      now,
    );
    if (!a.ok) throw new Error("setup failed");

    const moved = await updateTimeEntry(
      ctx.user.id,
      a.data.id,
      { ...studyRefs, startedAt: at("2026-11-05T05:00:00Z"), endedAt: at("2026-11-05T06:30:00Z") },
      now,
    );
    expect(moved.ok && moved.data).toMatchObject({ activityTypeId: studyRefs.activityTypeId });

    const clash = await updateTimeEntry(
      ctx.user.id,
      a.data.id,
      { ...studyRefs, startedAt: at("2026-11-05T05:00:00Z"), endedAt: at("2026-11-05T07:30:00Z") },
      now,
    );
    expect(!clash.ok && clash.error.code).toBe("CONFLICT");
  });

  it("lets the running entry's start be corrected while keeping it open", async () => {
    const run = await startTimer(ctx.user.id, studyRefs, at("2026-11-05T10:00:00Z"));
    if (!run.ok) throw new Error("setup failed");
    const r = await updateTimeEntry(
      ctx.user.id,
      run.data.id,
      { ...studyRefs, startedAt: at("2026-11-05T09:15:00Z"), endedAt: null },
      now,
    );
    expect(r.ok && r.data).toMatchObject({ startedAt: at("2026-11-05T09:15:00Z"), endedAt: null });
  });

  it("deletes only the owner's entries", async () => {
    const a = await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T05:00:00Z", "2026-11-05T06:00:00Z"),
      now,
    );
    if (!a.ok) throw new Error("setup failed");
    const other = await createTestUser();
    expect((await deleteTimeEntry(other.user.id, a.data.id)).ok).toBe(false);
    expect((await deleteTimeEntry(ctx.user.id, a.data.id)).ok).toBe(true);
  });
});

describe("database constraints (defence in depth)", () => {
  it("rejects a second running entry", async () => {
    await startTimer(ctx.user.id, studyRefs, at("2026-11-05T10:00:00Z"));
    await expect(
      db.timeEntry.create({
        data: { userId: ctx.user.id, ...studyRefs, startedAt: at("2026-11-05T09:00:00Z") },
      }),
    ).rejects.toThrow();
  });

  it("rejects overlapping rows even when the service is bypassed", async () => {
    const base = { userId: ctx.user.id, ...studyRefs };
    await db.timeEntry.create({
      data: { ...base, startedAt: at("2026-11-05T05:00:00Z"), endedAt: at("2026-11-05T06:00:00Z") },
    });
    await expect(
      db.timeEntry.create({
        data: {
          ...base,
          startedAt: at("2026-11-05T05:30:00Z"),
          endedAt: at("2026-11-05T06:30:00Z"),
        },
      }),
    ).rejects.toThrow(/time_entries_no_overlap|23P01|exclusion/i);
  });

  it("concurrent starts never leave two running timers", async () => {
    const refsA = studyRefs;
    const refsB = { activityTypeId: ctx.activity("Break / Gap").id };
    const results = await Promise.all([
      startTimer(ctx.user.id, refsA),
      startTimer(ctx.user.id, refsB),
      startTimer(ctx.user.id, refsA),
    ]);
    expect(results.some((r) => r.ok)).toBe(true);
    for (const r of results) if (!r.ok) expect(r.error.code).toBe("CONFLICT");
    expect(await db.timeEntry.count({ where: { userId: ctx.user.id, endedAt: null } })).toBe(1);
  });
});

describe("getDay", () => {
  it("clips overnight sleep and reports gaps in the user's day", async () => {
    // Dhaka (UTC+6), day starts 04:00 → 2026-11-05 window is 2026-11-04T22:00Z .. 2026-11-05T22:00Z
    const now = at("2026-11-05T06:00:00Z"); // 12:00 local
    await createManualEntry(
      ctx.user.id,
      manual("2026-11-04T17:00:00Z", "2026-11-05T01:00:00Z", {
        activityTypeId: ctx.activity("Sleep").id,
      }),
      now,
    );
    await createManualEntry(
      ctx.user.id,
      manual("2026-11-05T02:00:00Z", "2026-11-05T04:00:00Z", studyRefs),
      now,
    );
    const day = await getDay(ctx.user, "2026-11-05", now);
    expect(day.entries).toHaveLength(2);
    expect(day.summary.byCategory.SLEEP).toBe(3 * 3_600_000); // 22:00Z → 01:00Z
    expect(day.summary.byCategory.STUDY).toBe(2 * 3_600_000);
    expect(day.summary.gaps.map((g) => [g.start.toISOString(), g.end.toISOString()])).toEqual([
      ["2026-11-05T01:00:00.000Z", "2026-11-05T02:00:00.000Z"],
      ["2026-11-05T04:00:00.000Z", "2026-11-05T06:00:00.000Z"],
    ]);
  });
});
