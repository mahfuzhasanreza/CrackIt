import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "./csv";
import { BackupError, countRows, parseBackup, remapBackup } from "./remap";
import { MODEL_TABLE, TABLES, type Tables } from "./spec";

const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`;
const empty = () => Object.fromEntries(TABLES.map((t) => [t.key, []])) as unknown as Tables;
let counter = 100;
const newId = () => id(counter++);

describe("backup remap", () => {
  it("gives every row a new id, rewrites references and stamps the user", () => {
    const tables = empty();
    tables.tracks = [{ id: id(1), userId: "someone-else", name: "SWE" }];
    tables.topics = [
      { id: id(3), trackId: id(1), parentId: id(2), name: "Child" },
      { id: id(2), trackId: id(1), parentId: null, name: "Parent" },
    ];
    tables.tags = [{ id: id(4), name: "dp" }];
    tables.problems = [{ id: id(5), topicId: id(3), title: "Two Sum" }];
    tables.problemTags = [{ problemId: id(5), tagId: id(4) }];

    counter = 100;
    const out = remapBackup(tables, "me", newId);
    expect(out.tracks[0]).toMatchObject({ id: id(100), userId: "me", name: "SWE" });
    // Parents first; references follow the new ids.
    const [parent, child] = out.topics;
    expect(parent).toMatchObject({ name: "Parent", trackId: id(100), parentId: null });
    expect(child).toMatchObject({ name: "Child", parentId: parent!.id });
    expect(out.problems[0]!.topicId).toBe(child!.id);
    expect(out.problemTags[0]).toEqual({ problemId: out.problems[0]!.id, tagId: out.tags[0]!.id });
    expect(out.problemTags[0]).not.toHaveProperty("userId");
    // The input isn't mutated.
    expect(tables.tracks[0]!.userId).toBe("someone-else");
  });

  it("rejects references outside the backup, duplicate ids and bad ids", () => {
    const outside = empty();
    outside.timeEntries = [{ id: id(1), activityTypeId: id(99) }];
    expect(() => remapBackup(outside, "me", newId)).toThrow(/activityTypeId points at something/);

    const dup = empty();
    dup.tracks = [{ id: id(1) }, { id: id(1) }];
    expect(() => remapBackup(dup, "me", newId)).toThrow(/twice/);

    const bad = empty();
    bad.goals = [{ id: "nope" }];
    expect(() => remapBackup(bad, "me", newId)).toThrow(BackupError);

    const joinWithUser = empty();
    joinWithUser.tags = [{ id: id(4) }];
    joinWithUser.learningEntries = [{ id: id(5) }];
    joinWithUser.learningEntryTags = [{ learningEntryId: id(5), tagId: id(4), userId: "x" }];
    expect(() => remapBackup(joinWithUser, "me", newId)).toThrow(/unexpected userId/);
  });

  it("parses the envelope with readable errors", () => {
    const base = {
      app: "crackit",
      version: 1,
      exportedAt: "2026-11-08T00:00:00Z",
      profile: { name: null, timezone: "Asia/Dhaka", dayStartHour: 4 },
      tables: { tracks: [{ id: id(1) }] },
    };
    const b = parseBackup(base);
    expect(countRows(b.tables)).toMatchObject({ tracks: 1, goals: 0 });
    expect(() => parseBackup({ ...base, app: "other" })).toThrow("This isn't a CrackIt backup.");
    expect(() => parseBackup({ ...base, version: 2 })).toThrow(/another CrackIt version/);
    expect(() => parseBackup({ ...base, tables: { users: [] } })).toThrow(BackupError);
  });
});

describe("backup coverage", () => {
  it("every data model maps to exactly one backup table", () => {
    const mapped = Object.values(MODEL_TABLE).sort();
    expect(mapped).toEqual(TABLES.map((t) => t.key).sort());
  });
});

describe("csv", () => {
  it("quotes, escapes and defuses formulas", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-12.5")).toBe("-12.5");
    expect(csvCell("@me")).toBe("'@me");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["a", "b"], [[1, "x\ny"]])).toBe('a,b\r\n1,"x\ny"\r\n');
  });
});
