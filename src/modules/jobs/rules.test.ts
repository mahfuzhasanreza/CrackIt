import { describe, expect, it } from "vitest";

import {
  interviewBucket,
  interviewStats,
  mockScoreError,
  outcomeError,
  relativeTime,
  statusAfterInterview,
  transition,
} from "./rules";

const TODAY = "2026-11-05";

describe("transition", () => {
  it("leaving the wishlist records the applied date and an event", () => {
    expect(transition({ status: "WISHLIST", appliedOn: null }, "APPLIED", TODAY)).toEqual({
      status: "APPLIED",
      appliedOn: TODAY,
      event: { from: "WISHLIST", to: "APPLIED" },
    });
  });

  it("keeps an existing applied date", () => {
    expect(
      transition({ status: "APPLIED", appliedOn: "2026-10-01" }, "INTERVIEWING", TODAY).appliedOn,
    ).toBe("2026-10-01");
  });

  it("same status is a no-op", () => {
    expect(transition({ status: "OA", appliedOn: TODAY }, "OA", TODAY).event).toBeNull();
  });

  it("back to the wishlist keeps the date it had", () => {
    expect(transition({ status: "APPLIED", appliedOn: "2026-10-01" }, "WISHLIST", TODAY)).toEqual({
      status: "WISHLIST",
      appliedOn: "2026-10-01",
      event: { from: "APPLIED", to: "WISHLIST" },
    });
  });
});

describe("statusAfterInterview", () => {
  it("OA rounds move early applications to OA", () => {
    expect(statusAfterInterview("APPLIED", "OA")).toBe("OA");
    expect(statusAfterInterview("INTERVIEWING", "OA")).toBe("INTERVIEWING");
  });

  it("other rounds move to interviewing", () => {
    expect(statusAfterInterview("WISHLIST", "TECHNICAL")).toBe("INTERVIEWING");
    expect(statusAfterInterview("OA", "HR")).toBe("INTERVIEWING");
  });

  it("never reopens offers or closed applications", () => {
    expect(statusAfterInterview("OFFER", "HR")).toBe("OFFER");
    expect(statusAfterInterview("REJECTED", "TECHNICAL")).toBe("REJECTED");
    expect(statusAfterInterview("WITHDRAWN", "OA")).toBe("WITHDRAWN");
  });
});

describe("interview rules", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  const later = new Date("2026-11-09T10:00:00Z");
  const earlier = new Date("2026-11-07T10:00:00Z");

  it("only records a result once the interview has started", () => {
    expect(outcomeError("PASSED", later, now)).toMatch(/hasn't happened yet/);
    expect(outcomeError("FAILED", later, now)).not.toBeNull();
    expect(outcomeError("CANCELLED", later, now)).toBeNull();
    expect(outcomeError("PASSED", earlier, now)).toBeNull();
  });

  it("buckets interviews", () => {
    expect(interviewBucket({ outcome: "PENDING", scheduledAt: later }, now)).toBe("upcoming");
    expect(interviewBucket({ outcome: "PENDING", scheduledAt: earlier }, now)).toBe("needsOutcome");
    expect(interviewBucket({ outcome: "CANCELLED", scheduledAt: later }, now)).toBe("past");
    expect(interviewBucket({ outcome: "PASSED", scheduledAt: earlier }, now)).toBe("past");
  });

  it("summarises", () => {
    const s = interviewStats(
      [
        { outcome: "PENDING", scheduledAt: later, selfRating: null },
        { outcome: "PENDING", scheduledAt: new Date("2026-11-20T10:00:00Z"), selfRating: null },
        { outcome: "PASSED", scheduledAt: earlier, selfRating: 4 },
        { outcome: "FAILED", scheduledAt: earlier, selfRating: 2 },
        { outcome: "PASSED", scheduledAt: earlier, selfRating: null },
        { outcome: "CANCELLED", scheduledAt: earlier, selfRating: null },
      ],
      now,
    );
    expect(s).toEqual({ nextWeek: 1, done: 3, passed: 2, passRate: 2 / 3, avgRating: 3 });
    expect(interviewStats([], now)).toMatchObject({ passRate: null, avgRating: null });
  });

  it("describes relative times", () => {
    expect(relativeTime(new Date(now.getTime() + 30 * 60_000), now)).toBe("in 30 min");
    expect(relativeTime(new Date(now.getTime() + 3 * 3_600_000), now)).toBe("in 3 h");
    expect(relativeTime(later, now)).toBe("in 1 day");
    expect(relativeTime(new Date("2026-11-05T10:00:00Z"), now)).toBe("3 days ago");
  });

  it("future mocks can't have a score", () => {
    expect(mockScoreError("2026-11-09", "2026-11-08", 4)).not.toBeNull();
    expect(mockScoreError("2026-11-09", "2026-11-08", undefined)).toBeNull();
    expect(mockScoreError("2026-11-08", "2026-11-08", 4)).toBeNull();
  });
});
