import { describe, expect, it } from "vitest";

import {
  dateKeyToDb,
  dateKeysBetween,
  dbDateToKey,
  formatDateKey,
  dayOfWeek,
  dayWindow,
  formatDuration,
  formatHoursCompact,
  formatStopwatch,
  isValidDateKey,
  logicalDateKey,
  parseLocalDateTime,
  shiftDateKey,
  toDateKey,
  toLocalDateTimeInput,
  weekStartKey,
} from "./dates";

const DHAKA = "Asia/Dhaka"; // UTC+6, no DST
const NY = "America/New_York"; // DST

describe("isValidDateKey", () => {
  it.each([
    ["2026-11-05", true],
    ["2026-02-29", false],
    ["2028-02-29", true],
    ["2026-13-01", false],
    ["26-11-05", false],
  ])("%s → %s", (key, ok) => expect(isValidDateKey(key)).toBe(ok));
});

describe("logicalDateKey", () => {
  it("uses the local date after the day start hour", () => {
    // 2026-11-05 10:00 Dhaka
    expect(logicalDateKey(new Date("2026-11-05T04:00:00Z"), DHAKA, 4)).toBe("2026-11-05");
  });

  it("counts the small hours as the previous day", () => {
    // 2026-11-06 02:30 Dhaka (before 04:00) → still the 5th
    expect(logicalDateKey(new Date("2026-11-05T20:30:00Z"), DHAKA, 4)).toBe("2026-11-05");
  });

  it("with dayStartHour 0 behaves like the calendar date", () => {
    expect(logicalDateKey(new Date("2026-11-05T20:30:00Z"), DHAKA, 0)).toBe("2026-11-06");
  });
});

describe("dayWindow", () => {
  it("spans dayStartHour to dayStartHour in the user's zone", () => {
    const { start, end } = dayWindow("2026-11-05", DHAKA, 4);
    expect(start.toISOString()).toBe("2026-11-04T22:00:00.000Z"); // 04:00 +06
    expect(end.toISOString()).toBe("2026-11-05T22:00:00.000Z");
  });

  // The 02:00 DST switch falls in the logical day that *started* at 04:00 the day before.
  it("is 23h around spring-forward and 25h around fall-back", () => {
    const spring = dayWindow("2026-03-07", NY, 4);
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(23);
    const fall = dayWindow("2026-10-31", NY, 4);
    expect((fall.end.getTime() - fall.start.getTime()) / 3_600_000).toBe(25);
  });

  it("rejects invalid keys", () => {
    expect(() => dayWindow("2026-02-30", DHAKA, 4)).toThrow();
  });
});

describe("date key helpers", () => {
  it("shifts across month and year boundaries", () => {
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("toDateKey uses the zone's calendar date", () => {
    expect(toDateKey(new Date("2026-11-05T20:30:00Z"), DHAKA)).toBe("2026-11-06");
    expect(toDateKey(new Date("2026-11-05T20:30:00Z"), NY)).toBe("2026-11-05");
  });
});

describe("datetime-local round trip", () => {
  it("interprets input as wall-clock time in the user's zone", () => {
    const d = parseLocalDateTime("2026-11-05T09:15", DHAKA)!;
    expect(d.toISOString()).toBe("2026-11-05T03:15:00.000Z");
    expect(toLocalDateTimeInput(d, DHAKA)).toBe("2026-11-05T09:15");
  });

  it("rejects malformed values", () => {
    expect(parseLocalDateTime("2026-11-05 09:15", DHAKA)).toBeNull();
    expect(parseLocalDateTime("2026-02-30T09:15", DHAKA)).toBeNull();
    expect(parseLocalDateTime("2026-11-05T24:00", DHAKA)).toBeNull();
  });
});

describe("formatting", () => {
  it.each([
    [0, "0m"],
    [59_999, "0m"],
    [45 * 60_000, "45m"],
    [125 * 60_000, "2h 05m"],
  ])("formatDuration(%i) → %s", (ms, out) => expect(formatDuration(ms)).toBe(out));

  it("formatStopwatch", () => {
    expect(formatStopwatch(65_000)).toBe("01:05");
    expect(formatStopwatch(3_723_000)).toBe("1:02:03");
  });
});

describe("week helpers", () => {
  it("dayOfWeek", () => {
    expect(dayOfWeek("2026-11-05")).toBe(4); // Thursday
  });

  it("weekStartKey defaults to Monday and supports other starts", () => {
    expect(weekStartKey("2026-11-05")).toBe("2026-11-02");
    expect(weekStartKey("2026-11-02")).toBe("2026-11-02");
    expect(weekStartKey("2026-11-01")).toBe("2026-10-26"); // Sunday → previous Monday
    expect(weekStartKey("2026-11-05", 6)).toBe("2026-10-31"); // Saturday start
  });

  it("dateKeysBetween is inclusive and crosses months", () => {
    expect(dateKeysBetween("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("formatHoursCompact", () => {
  it.each([
    [45 * 60_000, "45m"],
    [2 * 3_600_000, "2h"],
    [5.5 * 3_600_000, "5.5h"],
    [7 * 3_600_000 + 12 * 60_000, "7.2h"],
  ])("%i → %s", (ms, out) => expect(formatHoursCompact(ms)).toBe(out));
});

describe("db date round trip", () => {
  it("maps a key to UTC midnight and back", () => {
    expect(dateKeyToDb("2026-03-01").toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(dbDateToKey(dateKeyToDb("2026-12-31"))).toBe("2026-12-31");
  });

  it("rejects invalid keys", () => {
    expect(() => dateKeyToDb("2026-02-30")).toThrow();
  });
});

describe("formatDateKey", () => {
  it("formats a key without timezone drift", () => {
    expect(formatDateKey("2026-11-05")).toBe("5 Nov");
    expect(formatDateKey("2026-12-31", { year: "numeric" })).toBe("31 Dec 2026");
  });
});
