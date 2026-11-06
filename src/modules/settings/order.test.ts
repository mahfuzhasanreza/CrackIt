import { describe, expect, it } from "vitest";

import { moved } from "./order";

describe("moved", () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("swaps with the neighbour", () => {
    expect(moved(rows, "b", "up")!.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(moved(rows, "b", "down")!.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });
  it("is a no-op at the ends or for unknown ids", () => {
    expect(moved(rows, "a", "up")).toBeNull();
    expect(moved(rows, "c", "down")).toBeNull();
    expect(moved(rows, "z", "up")).toBeNull();
  });
});
