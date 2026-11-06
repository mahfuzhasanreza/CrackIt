import { describe, expect, it } from "vitest";

import { niceTicks } from "./ticks";

describe("niceTicks", () => {
  it("rounds the top up to a clean value in ≤ 4 steps", () => {
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(3.2)).toEqual([0, 1, 2, 3, 4]);
    expect(niceTicks(130)).toEqual([0, 50, 100, 150]);
    expect(niceTicks(9)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it("keeps integer steps for counts and handles an empty chart", () => {
    expect(niceTicks(2, { integer: true })).toEqual([0, 1, 2]);
    expect(niceTicks(0, { integer: true })).toEqual([0, 1]);
    expect(niceTicks(9, { integer: true })).toEqual([0, 3, 6, 9]);
  });
});
