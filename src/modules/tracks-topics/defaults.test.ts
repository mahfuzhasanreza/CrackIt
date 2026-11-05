import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_TYPES } from "../time-tracking/defaults";

import { DEFAULT_TRACKS, type DefaultTopic } from "./defaults";

const HEX = /^#[0-9a-fA-F]{6}$/; // mirrors the DB CHECK constraints

function expectUniqueSiblingNames(topics: DefaultTopic[]) {
  const names = topics.map((t) => t.name);
  expect(new Set(names).size).toBe(names.length);
  topics.forEach((t) => t.children && expectUniqueSiblingNames(t.children));
}

describe("default seed data", () => {
  it("tracks have unique names and valid colors", () => {
    expect(new Set(DEFAULT_TRACKS.map((t) => t.name)).size).toBe(DEFAULT_TRACKS.length);
    DEFAULT_TRACKS.forEach((t) => expect(t.color).toMatch(HEX));
  });

  it("topic names are unique among siblings (DB unique index)", () => {
    DEFAULT_TRACKS.forEach((t) => expectUniqueSiblingNames(t.topics));
  });

  it("activity types have unique names, valid colors, and cover sleep, study and breaks", () => {
    expect(new Set(DEFAULT_ACTIVITY_TYPES.map((a) => a.name)).size).toBe(
      DEFAULT_ACTIVITY_TYPES.length,
    );
    DEFAULT_ACTIVITY_TYPES.forEach((a) => expect(a.color).toMatch(HEX));
    const categories = new Set(DEFAULT_ACTIVITY_TYPES.map((a) => a.category));
    ["STUDY", "SLEEP", "BREAK"].forEach((c) => expect(categories).toContain(c));
  });
});
