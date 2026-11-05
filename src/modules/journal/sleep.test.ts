import { describe, expect, it } from "vitest";

import { resolveSleepTimes, sleepDurationMs, sleepError, toTimeInput } from "./sleep";

const DHAKA = "Asia/Dhaka"; // UTC+6

describe("resolveSleepTimes", () => {
  it("puts an evening bedtime on the previous date and wake-up on the day", () => {
    const t = resolveSleepTimes("2026-11-05", { bedTime: "23:30", wakeTime: "07:00" }, DHAKA, 4);
    expect(t.bedAt?.toISOString()).toBe("2026-11-04T17:30:00.000Z");
    expect(t.wakeAt?.toISOString()).toBe("2026-11-05T01:00:00.000Z");
    expect(sleepDurationMs(t)).toBe(7.5 * 3600_000);
    expect(sleepError(t)).toBeNull();
  });

  it("keeps an after-midnight bedtime on the day's own date", () => {
    const t = resolveSleepTimes("2026-11-05", { bedTime: "01:15", wakeTime: "08:15" }, DHAKA, 4);
    expect(t.bedAt?.toISOString()).toBe("2026-11-04T19:15:00.000Z");
    expect(sleepDurationMs(t)).toBe(7 * 3600_000);
  });

  it("treats a wake-up before the day starts as the following night", () => {
    const t = resolveSleepTimes("2026-11-05", { wakeTime: "02:00" }, DHAKA, 4);
    expect(t.wakeAt?.toISOString()).toBe("2026-11-05T20:00:00.000Z");
    expect(t.bedAt).toBeNull();
  });

  it("leaves missing times empty", () => {
    expect(resolveSleepTimes("2026-11-05", {}, DHAKA, 4)).toEqual({ bedAt: null, wakeAt: null });
  });

  it("flags impossible nights", () => {
    const backwards = resolveSleepTimes(
      "2026-11-05",
      { bedTime: "09:00", wakeTime: "08:00" },
      DHAKA,
      4,
    );
    expect(sleepError(backwards)).toMatch(/after bedtime/);
    expect(sleepDurationMs(backwards)).toBeNull();
  });

  it("formats an instant back for a time input", () => {
    expect(toTimeInput(new Date("2026-11-04T17:30:00Z"), DHAKA)).toBe("23:30");
  });
});
