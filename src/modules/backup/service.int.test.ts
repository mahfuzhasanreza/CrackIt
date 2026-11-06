import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import { exportBackup, exportCsv, importBackup } from "./service";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let a: Ctx;

/** A bit of everything, including join tables and self-references. */
async function seed(ctx: Ctx) {
  const userId = ctx.user.id;
  const track = ctx.track("SWE / Full-Stack");
  await db.timeEntry.create({
    data: {
      userId,
      activityTypeId: ctx.activity("Study").id,
      trackId: track.id,
      startedAt: new Date("2026-11-01T03:00:00Z"),
      endedAt: new Date("2026-11-01T05:00:00Z"),
      note: "=SUM(A1)",
      focusRating: 4,
    },
  });
  const tag = await db.tag.create({ data: { userId, name: "dp" } });
  await db.problem.create({
    data: {
      userId,
      title: "Climbing Stairs",
      status: "SOLVED",
      solvedAt: new Date("2026-11-01T06:00:00Z"),
      tags: { create: { tagId: tag.id } },
    },
  });
  await db.learningEntry.create({
    data: {
      userId,
      date: new Date("2026-11-01"),
      title: "Memoization",
      tags: { create: { tagId: tag.id } },
    },
  });
  const checklist = await db.checklist.create({
    data: { userId, title: "Daily", type: "HABIT", recurrence: "DAILY" },
  });
  const item = await db.checklistItem.create({
    data: { userId, checklistId: checklist.id, title: "1 problem" },
  });
  await db.checklistItemCompletion.create({
    data: { userId, itemId: item.id, period: new Date("2026-11-01") },
  });
  const org = await db.organization.create({ data: { userId, name: "Acme" } });
  const app = await db.application.create({
    data: {
      userId,
      organizationId: org.id,
      trackId: track.id,
      role: "SWE",
      status: "APPLIED",
      appliedOn: new Date("2026-11-01"),
    },
  });
  await db.applicationEvent.create({
    data: { userId, applicationId: app.id, toStatus: "APPLIED", at: new Date() },
  });
  await db.practiceQuestion.create({
    data: { userId, trackId: track.id, question: "What is a closure?", answerMd: "" },
  });
  await db.presentation.create({
    data: {
      userId,
      trackId: track.id,
      title: "Demo",
      date: new Date("2026-11-01"),
      durationMin: 10,
    },
  });
  await db.goal.create({
    data: {
      userId,
      metric: "STUDY_MINUTES",
      period: "WEEK",
      target: 600,
      trackId: track.id,
      startsOn: new Date("2026-11-01"),
    },
  });
}

const roundTrip = <T>(v: T): unknown => JSON.parse(JSON.stringify(v));

beforeEach(async () => {
  a = await createTestUser();
  await seed(a);
});

describe("backup", () => {
  it("restores into another account with fresh ids and the same content", async () => {
    const backup = await exportBackup(a.user.id);
    expect(backup.tables.problemTags).toHaveLength(1);
    expect(backup.tables.topics.length).toBeGreaterThan(5);

    const b = await createTestUser({ timezone: "Europe/London" });
    const result = await importBackup(b.user.id, roundTrip(backup));
    expect(result.ok).toBe(true);

    const restored = await exportBackup(b.user.id);
    for (const key of Object.keys(backup.tables) as (keyof typeof backup.tables)[]) {
      expect(restored.tables[key], key).toHaveLength(backup.tables[key].length);
    }
    // Profile settings come along; ids are new; references still line up.
    expect(restored.profile.timezone).toBe(a.user.timezone);
    expect(restored.tables.tracks.map((t) => t.id)).not.toContain(backup.tables.tracks[0]!.id);
    const goal = restored.tables.goals[0]!;
    expect(restored.tables.tracks.some((t) => t.id === goal.trackId)).toBe(true);
    const child = restored.tables.topics.find((t) => t.parentId !== null)!;
    expect(restored.tables.topics.some((t) => t.id === child.parentId)).toBe(true);

    // The source account is untouched.
    expect((await exportBackup(a.user.id)).tables.timeEntries).toHaveLength(1);
  });

  it("restoring over your own data replaces it", async () => {
    const backup = roundTrip(await exportBackup(a.user.id));
    await db.project.create({ data: { userId: a.user.id, name: "Added after the backup" } });
    expect((await importBackup(a.user.id, backup)).ok).toBe(true);
    expect(await db.project.count({ where: { userId: a.user.id } })).toBe(0);
    expect(await db.timeEntry.count({ where: { userId: a.user.id } })).toBe(1);
  });

  it("a backup the database rejects changes nothing", async () => {
    const backup = (await exportBackup(a.user.id)) as unknown as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    backup.tables.resources = [
      {
        id: "00000000-0000-7000-8000-000000000001",
        title: "Broken",
        type: "BOOK",
        status: "PLANNED",
        totalUnits: 3,
        completedUnits: 9, // violates the units CHECK
      },
    ];
    const result = await importBackup(a.user.id, roundTrip(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/your data is unchanged/);
    expect(await db.timeEntry.count({ where: { userId: a.user.id } })).toBe(1);
    expect(await db.goal.count({ where: { userId: a.user.id } })).toBe(1);
  });

  it("refuses files that aren't CrackIt backups", async () => {
    const result = await importBackup(a.user.id, { hello: "world" });
    expect(result.ok).toBe(false);
  });

  it("exports CSVs in local time with formulas defused", async () => {
    const csv = await exportCsv(a.user, "time-entries");
    const [header, row] = csv.trim().split("\r\n");
    expect(header).toBe("date,start,end,minutes,activity,category,track,topic,focus,source,note");
    // 03:00Z = 09:00 in Dhaka.
    expect(row).toBe(
      "2026-11-01,2026-11-01 09:00,2026-11-01 11:00,120,Study,STUDY,SWE / Full-Stack,,4,TIMER,'=SUM(A1)",
    );
    expect(await exportCsv(a.user, "problems")).toContain("Climbing Stairs,LEETCODE,MEDIUM,SOLVED");
    expect(await exportCsv(a.user, "applications")).toContain(
      "Acme,COMPANY,SWE,SWE / Full-Stack,APPLIED,2026-11-01",
    );
  });
});
