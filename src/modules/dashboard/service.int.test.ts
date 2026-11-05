import { describe, expect, it } from "vitest";

import { createTestUser } from "../../../test/factories";
import { createManualEntry } from "../time-tracking/service";

import { getDashboard } from "./service";

const H = 3_600_000;

describe("getDashboard", () => {
  it("aggregates today, the week by track, the last 7 days and the streak", async () => {
    const ctx = await createTestUser(); // Asia/Dhaka (UTC+6), day starts 04:00
    const swe = ctx.track("SWE / Full-Stack").id;
    const lect = ctx.track("University Lecturer").id;
    const study = ctx.activity("Study").id;
    // "now" = Thu 2026-11-05 18:00 local (12:00Z). Week starts Mon 2026-11-02.
    const now = new Date("2026-11-05T12:00:00Z");
    const add = (start: string, end: string, trackId: string) =>
      createManualEntry(
        ctx.user.id,
        { activityTypeId: study, trackId, startedAt: new Date(start), endedAt: new Date(end) },
        now,
      );

    await add("2026-11-02T03:00:00Z", "2026-11-02T05:00:00Z", swe); // Mon 2h
    await add("2026-11-03T03:00:00Z", "2026-11-03T04:30:00Z", lect); // Tue 1.5h
    await add("2026-11-04T03:00:00Z", "2026-11-04T04:00:00Z", swe); // Wed 1h
    await add("2026-11-05T03:00:00Z", "2026-11-05T03:30:00Z", swe); // Thu 0.5h (in progress)
    await add("2026-10-31T03:00:00Z", "2026-10-31T06:00:00Z", swe); // Sat before: 3h, then Sun gap

    const d = await getDashboard(ctx.user, now);

    expect(d.todayKey).toBe("2026-11-05");
    expect(d.week.startKey).toBe("2026-11-02");
    expect(d.week.byTrack).toEqual({ [swe]: 3.5 * H, [lect]: 1.5 * H });
    expect(d.week.studyMs).toBe(5 * H);
    expect(d.last7.map((x) => x.key)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
    expect(d.last7.map((x) => x.studyMs / H)).toEqual([0, 3, 0, 2, 1.5, 1, 0.5]);
    // Mon–Wed qualify (≥1h); today (0.5h) is still in progress → streak 3; Sat alone → best 3.
    expect(d.streak).toMatchObject({ current: 3, best: 3 });
    expect(d.tracks.map((t) => t.weeklyTargetMinutes)).toEqual([1200, 600]);
  });
});
