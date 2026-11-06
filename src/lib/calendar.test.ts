import { describe, expect, it } from "vitest";

import { monthGrid, parseMonthKey, shiftMonth } from "./calendar";

describe("calendar", () => {
  it("parses month keys", () => {
    expect(parseMonthKey("2026-11")).toBe("2026-11-01");
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey(undefined)).toBeNull();
  });

  it("shifts across years", () => {
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("builds Monday-first weeks covering the month", () => {
    // November 2026 starts on a Sunday and ends on a Monday → 6 rows.
    const nov = monthGrid("2026-11-01");
    expect(nov).toHaveLength(6);
    expect(nov[0]![0]).toEqual({ key: "2026-10-26", inMonth: false });
    expect(nov[0]![6]).toEqual({ key: "2026-11-01", inMonth: true });
    expect(nov.at(-1)![0]).toEqual({ key: "2026-11-30", inMonth: true });
    // February 2027 starts on a Monday and has exactly 4 weeks.
    expect(monthGrid("2027-02-01")).toHaveLength(4);
  });
});
