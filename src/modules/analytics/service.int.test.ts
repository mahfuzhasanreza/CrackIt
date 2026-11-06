import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";
import { deleteGoal, saveGoal } from "../goals/service";
import { goalFormSchema } from "../goals/validators";

import { getAnalytics } from "./service";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
const H = 3_600_000;
// Wednesday 2026-11-11, 18:00 in Dhaka (UTC+6, day starts 04:00).
const now = new Date("2026-11-11T12:00:00Z");
const at = (iso: string) => new Date(iso);

beforeEach(async () => {
  ctx = await createTestUser();
});

async function entry(
  activity: string,
  startedAt: string,
  endedAt: string,
  extra: { trackId?: string; focusRating?: number } = {},
) {
  await db.timeEntry.create({
    data: {
      userId: ctx.user.id,
      activityTypeId: ctx.activity(activity).id,
      startedAt: at(startedAt),
      endedAt: at(endedAt),
      ...extra,
    },
  });
}

describe("analytics", () => {
  it("aggregates study, sleep, focus, problems and the funnel for the range", async () => {
    const swe = ctx.track("SWE / Full-Stack");
    // Yesterday (11-10): 2h SWE at focus 4, 1h untracked-track study at focus 1.
    await entry("Study", "2026-11-10T03:00:00Z", "2026-11-10T05:00:00Z", {
      trackId: swe.id,
      focusRating: 4,
    });
    await entry("Study", "2026-11-10T06:00:00Z", "2026-11-10T07:00:00Z", { focusRating: 1 });
    // Night into 11-11: 23:00 → 06:00 Dhaka = 7h.
    await entry("Sleep", "2026-11-10T17:00:00Z", "2026-11-11T00:00:00Z");
    // A study session 40 days ago is in the previous 30-day range.
    await entry("Study", "2026-10-02T03:00:00Z", "2026-10-02T04:00:00Z", { trackId: swe.id });

    await db.problem.create({
      data: { userId: ctx.user.id, title: "Two Sum", status: "SOLVED", solvedAt: now },
    });
    const org = await db.organization.create({ data: { userId: ctx.user.id, name: "Acme" } });
    const app = await db.application.create({
      data: {
        userId: ctx.user.id,
        organizationId: org.id,
        role: "SWE",
        status: "INTERVIEWING",
        appliedOn: at("2026-11-01"),
      },
    });
    await db.applicationEvent.createMany({
      data: (["APPLIED", "INTERVIEWING"] as const).map((toStatus) => ({
        userId: ctx.user.id,
        applicationId: app.id,
        toStatus,
        at: now,
      })),
    });

    const a = await getAnalytics(ctx.user, "30d", now);
    expect(a).toMatchObject({
      range: "30d",
      bucket: "day",
      from: "2026-10-13",
      today: "2026-11-11",
    });
    expect(a.kpis.study).toEqual({ value: 3 * H, prev: 1 * H });
    expect(a.kpis.sleep.value).toBe(7 * H);
    expect(a.kpis.focus.value).toBeCloseTo(3); // (4·2h + 1·1h) / 3h
    expect(a.kpis.problems.value).toBe(1);
    expect(a.kpis.applications.value).toBe(1);

    expect(a.split.map((s) => [s.name, s.ms])).toEqual([
      ["SWE / Full-Stack", 2 * H],
      ["No track", 1 * H],
    ]);
    const yesterday = a.study.columns.find((c) => c.key === "2026-11-10")!;
    expect(yesterday.values).toEqual({ [swe.id]: 2 * H, none: 1 * H });
    expect(a.study.columns).toHaveLength(30);

    expect(a.funnel.counts).toEqual({ APPLIED: 1, OA: 1, INTERVIEWING: 1, OFFER: 0 });
    expect(a.heatmap.activeDays).toBe(2);
    expect(a.heatmap.weeks.flat().filter(Boolean)).toHaveLength(365);
    expect(a.sleep.find((p) => p.key === "2026-11-11")!.value).toBe(7 * H);

    const quarter = await getAnalytics(ctx.user, "90d", now);
    expect(quarter.bucket).toBe("week");
    expect(quarter.study.columns[0]!.key <= quarter.from).toBe(true);
  });

  it("tracks goals per period, scoped to their track", async () => {
    const swe = ctx.track("SWE / Full-Stack");
    await entry("Study", "2026-11-09T03:00:00Z", "2026-11-09T06:00:00Z", { trackId: swe.id });
    await entry("Study", "2026-11-03T03:00:00Z", "2026-11-03T04:00:00Z", { trackId: swe.id });
    const input = (o: Record<string, string>) =>
      goalFormSchema.parse({ period: "WEEK", startsOn: "2026-10-01", ...o });

    expect(
      (
        await saveGoal(
          ctx.user.id,
          input({ metric: "STUDY_MINUTES", target: "2.5", trackId: swe.id }),
        )
      ).ok,
    ).toBe(true);
    // A track on a problems goal is dropped by the validator.
    await saveGoal(
      ctx.user.id,
      input({ metric: "PROBLEMS_SOLVED", target: "1", period: "DAY", trackId: swe.id }),
    );

    const { goals } = await getAnalytics(ctx.user, "7d", now);
    const study = goals.find((g) => g.metric === "STUDY_MINUTES")!;
    expect(study.target).toBe(150);
    expect(study.periods).toHaveLength(7); // weeks starting 2026-09-28 … 2026-11-09
    expect(study.periods.at(-1)).toMatchObject({
      start: "2026-11-09",
      actual: 180,
      met: true,
      current: true,
    });
    expect(study.periods.at(-2)).toMatchObject({ start: "2026-11-02", actual: 60, met: false });

    const problems = goals.find((g) => g.metric === "PROBLEMS_SOLVED")!;
    expect(problems.track).toBeNull();
    expect(problems.periods).toHaveLength(14);

    const other = await createTestUser();
    expect((await deleteGoal(other.user.id, study.id)).ok).toBe(false);
    expect(
      (
        await saveGoal(
          other.user.id,
          input({ metric: "STUDY_MINUTES", target: "1", trackId: swe.id }),
        )
      ).ok,
    ).toBe(false);
    expect((await deleteGoal(ctx.user.id, study.id)).ok).toBe(true);
  });

  it("the database rejects a track on a non-study goal", async () => {
    await expect(
      db.goal.create({
        data: {
          userId: ctx.user.id,
          trackId: ctx.track("SWE / Full-Stack").id,
          metric: "LEARNING_ENTRIES",
          period: "WEEK",
          target: 3,
          startsOn: at("2026-11-01"),
        },
      }),
    ).rejects.toThrow();
  });
});
