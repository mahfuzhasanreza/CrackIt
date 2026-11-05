import { describe, expect, it } from "vitest";

import { clipToWindow, findGaps, type SummaryEntry, summarizeDay } from "./day-summary";

const t = (hhmm: string, day = 5) =>
  new Date(`2026-11-${String(day).padStart(2, "0")}T${hhmm}:00Z`);
const H = 3_600_000;
const window = { start: t("04:00"), end: t("04:00", 6) };

function entry(
  id: string,
  start: Date,
  end: Date | null,
  extra: Partial<SummaryEntry> = {},
): SummaryEntry {
  return {
    id,
    startedAt: start,
    endedAt: end,
    category: "STUDY",
    isProductive: true,
    trackId: "swe",
    ...extra,
  };
}

describe("clipToWindow", () => {
  it("clips an entry that crosses the day start (e.g. overnight sleep)", () => {
    const sleep = entry("s", t("23:00", 4), t("06:00"), { category: "SLEEP" });
    const [seg] = clipToWindow([sleep], window, t("12:00"));
    expect(seg).toMatchObject({ start: t("04:00"), end: t("06:00"), running: false });
  });

  it("runs a running entry up to now", () => {
    const [seg] = clipToWindow([entry("r", t("10:00"), null)], window, t("11:30"));
    expect(seg).toMatchObject({ start: t("10:00"), end: t("11:30"), running: true });
  });

  it("drops entries outside the window and sorts by start", () => {
    const segs = clipToWindow(
      [
        entry("b", t("12:00"), t("13:00")),
        entry("a", t("08:00"), t("09:00")),
        entry("x", t("01:00"), t("02:00")),
      ],
      window,
      t("20:00"),
    );
    expect(segs.map((s) => s.entryId)).toEqual(["a", "b"]);
  });
});

describe("findGaps", () => {
  it("finds holes before, between and after entries up to now", () => {
    const segs = clipToWindow(
      [entry("a", t("06:00"), t("08:00")), entry("b", t("09:00"), t("10:00"))],
      window,
      t("12:00"),
    );
    expect(findGaps(segs, window, t("12:00"))).toEqual([
      { start: t("04:00"), end: t("06:00") },
      { start: t("08:00"), end: t("09:00") },
      { start: t("10:00"), end: t("12:00") },
    ]);
  });

  it("stops at the end of the window for past days", () => {
    const segs = clipToWindow([entry("a", t("04:00"), t("20:00"))], window, t("12:00", 9));
    expect(findGaps(segs, window, t("12:00", 9))).toEqual([
      { start: t("20:00"), end: t("04:00", 6) },
    ]);
  });

  it("returns nothing for a future day", () => {
    expect(findGaps([], window, t("12:00", 1))).toEqual([]);
  });

  it("ignores gaps shorter than a minute", () => {
    const segs = clipToWindow(
      [
        entry("a", t("04:00"), new Date(t("05:00").getTime() - 30_000)),
        entry("b", t("05:00"), t("06:00")),
      ],
      window,
      t("06:00"),
    );
    expect(findGaps(segs, window, t("06:00"))).toEqual([]);
  });
});

describe("summarizeDay", () => {
  it("totals tracked, untracked, productive, per category and per track", () => {
    const entries = [
      entry("sleep", t("22:00", 4), t("06:00"), {
        category: "SLEEP",
        isProductive: false,
        trackId: null,
      }),
      entry("dsa", t("07:00"), t("09:00")),
      entry("lect", t("09:00"), t("10:00"), { trackId: "lecturer" }),
      entry("brk", t("10:00"), t("10:30"), {
        category: "BREAK",
        isProductive: false,
        trackId: null,
      }),
      entry("now", t("11:00"), null),
    ];
    const s = summarizeDay(entries, window, t("12:00"));
    expect(s.elapsedMs).toBe(8 * H);
    expect(s.byCategory.SLEEP).toBe(2 * H); // only the share after 04:00
    expect(s.byCategory.STUDY).toBe(4 * H); // 2 + 1 + running 1
    expect(s.byCategory.BREAK).toBe(0.5 * H);
    expect(s.byTrack).toEqual({ swe: 3 * H, lecturer: 1 * H });
    expect(s.productiveMs).toBe(4 * H);
    expect(s.trackedMs).toBe(6.5 * H);
    expect(s.untrackedMs).toBe(1.5 * H);
    expect(s.gaps).toEqual([
      { start: t("06:00"), end: t("07:00") },
      { start: t("10:30"), end: t("11:00") },
    ]);
  });

  it("is all untracked for an empty past day", () => {
    const s = summarizeDay([], window, t("12:00", 7));
    expect(s.trackedMs).toBe(0);
    expect(s.untrackedMs).toBe(24 * H);
    expect(s.gaps).toEqual([window]);
  });
});
