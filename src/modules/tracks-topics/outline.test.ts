import { describe, expect, it } from "vitest";

import { DEFAULT_TRACKS } from "./defaults";
import { countTopics, formatOutline, OutlineError, parseOutline } from "./outline";

describe("topic outlines", () => {
  it("nests by relative indentation, with optional bullets and tabs", () => {
    const text = [
      "Data Structures",
      "    - Arrays",
      "    * Linked   lists",
      "\t\t\tDoubly linked",
      "",
      "System Design",
      "  • Caching",
    ].join("\n");
    expect(parseOutline(text)).toEqual([
      {
        name: "Data Structures",
        children: [
          { name: "Arrays" },
          { name: "Linked lists", children: [{ name: "Doubly linked" }] },
        ],
      },
      { name: "System Design", children: [{ name: "Caching" }] },
    ]);
  });

  it("dedents back to the right ancestor", () => {
    const tree = parseOutline("A\n  B\n    C\n  D\nE");
    expect(tree.map((t) => t.name)).toEqual(["A", "E"]);
    expect(tree[0]!.children!.map((t) => t.name)).toEqual(["B", "D"]);
  });

  it("rejects duplicates among siblings, too-deep nesting and huge outlines", () => {
    expect(() => parseOutline("Graphs\ngraphs")).toThrow(/Line 2: “graphs” is listed twice/);
    // Same name under different parents is fine.
    expect(() => parseOutline("A\n  Basics\nB\n  Basics")).not.toThrow();
    expect(() => parseOutline("1\n 2\n  3\n   4\n    5")).toThrow(OutlineError);
    expect(() => parseOutline("1\n 2\n  3\n   4")).not.toThrow();
    expect(() => parseOutline(Array.from({ length: 301 }, (_, i) => `T${i}`).join("\n"))).toThrow(
      /At most 300/,
    );
    expect(() => parseOutline("x".repeat(121))).toThrow(/under 120/);
  });

  it("round-trips the starter templates", () => {
    for (const t of DEFAULT_TRACKS) {
      const text = formatOutline(t.topics);
      const parsed = parseOutline(text);
      expect(countTopics(parsed)).toBe(countTopics(t.topics));
      expect(formatOutline(parsed)).toBe(text);
    }
    expect(parseOutline("  \n\n")).toEqual([]);
  });
});
