import { describe, expect, it } from "vitest";

import { createMatcher, GO_TO, SEQUENCE_MS } from "./keymap";

describe("shortcut matcher", () => {
  it("g then a letter navigates", () => {
    const m = createMatcher();
    expect(m("g", 0)).toBeNull();
    expect(m("p", 200)).toEqual({ type: "navigate", href: "/problems" });
    // The prefix is consumed: a lone "p" does nothing.
    expect(m("p", 300)).toBeNull();
  });

  it("the prefix expires and unknown second keys cancel it", () => {
    const m = createMatcher();
    m("g", 0);
    expect(m("d", SEQUENCE_MS + 1)).toBeNull();
    m("g", 5000);
    expect(m("z", 5100)).toBeNull();
    expect(m("d", 5200)).toBeNull();
  });

  it("single-key actions", () => {
    const m = createMatcher();
    expect(m("?", 0)).toEqual({ type: "help" });
    expect(m("s", 0)).toEqual({ type: "timer" });
    // "g s" is settings, not the timer.
    m("g", 10);
    expect(m("s", 20)).toEqual({ type: "navigate", href: "/settings" });
  });

  it("every go-to key is unique", () => {
    expect(new Set(GO_TO.map((g) => g.key)).size).toBe(GO_TO.length);
  });
});
