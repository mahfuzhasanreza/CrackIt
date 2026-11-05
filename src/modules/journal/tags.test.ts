import { describe, expect, it } from "vitest";

import { normalizeTag, parseTags } from "./tags";

describe("tags", () => {
  it("normalises case, spaces and a leading #", () => {
    expect(normalizeTag("  #System   Design ")).toBe("system design");
  });

  it("splits on commas and newlines, dropping blanks and duplicates", () => {
    expect(parseTags("React, #hooks,,\nreact , C++")).toEqual({
      ok: true,
      data: ["react", "hooks", "c++"],
    });
    expect(parseTags("  ")).toEqual({ ok: true, data: [] });
  });

  it("limits count, length and characters", () => {
    expect(parseTags(Array.from({ length: 11 }, (_, i) => `t${i}`).join(",")).ok).toBe(false);
    expect(parseTags("a".repeat(33)).ok).toBe(false);
    expect(parseTags("bad<tag>").ok).toBe(false);
    expect(parseTags("node.js, ci/cd, c#").ok).toBe(true);
  });
});
