import { describe, expect, it } from "vitest";

import { dailyLogFormSchema, learningEntryFormSchema, learningFilterSchema } from "./validators";

describe("dailyLogFormSchema", () => {
  it("treats empty form fields as not provided", () => {
    const parsed = dailyLogFormSchema.parse({
      date: "2026-11-05",
      mood: "4",
      energy: "",
      bedTime: "23:30",
      wakeTime: "",
      reflection: "  good day  ",
    });
    expect(parsed).toEqual({
      date: "2026-11-05",
      mood: 4,
      bedTime: "23:30",
      reflection: "good day",
    });
  });

  it("rejects bad dates, ratings and times", () => {
    expect(dailyLogFormSchema.safeParse({ date: "2026-02-30" }).success).toBe(false);
    expect(dailyLogFormSchema.safeParse({ date: "2026-11-05", mood: "6" }).success).toBe(false);
    expect(dailyLogFormSchema.safeParse({ date: "2026-11-05", bedTime: "24:00" }).success).toBe(
      false,
    );
  });
});

describe("learningEntryFormSchema", () => {
  const base = { date: "2026-11-05", title: " Dijkstra ", contentMd: "**pq**" };

  it("parses tags and the schedule checkbox", () => {
    const parsed = learningEntryFormSchema.parse({
      ...base,
      tags: "Graphs, #shortest path",
      scheduleReview: "on",
    });
    expect(parsed).toMatchObject({
      title: "Dijkstra",
      tags: ["graphs", "shortest path"],
      scheduleReview: true,
    });
    expect(learningEntryFormSchema.parse(base)).toMatchObject({ tags: [], scheduleReview: false });
  });

  it("requires a title and an http(s) source", () => {
    expect(learningEntryFormSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
    expect(
      learningEntryFormSchema.safeParse({ ...base, sourceUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      learningEntryFormSchema.safeParse({ ...base, sourceUrl: "https://cp-algorithms.com" })
        .success,
    ).toBe(true);
  });

  it("reports tag problems on the tags field", () => {
    const result = learningEntryFormSchema.safeParse({ ...base, tags: "bad<tag>" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.tags?.[0]).toMatch(/unsupported/);
  });
});

describe("learningFilterSchema", () => {
  it("ignores invalid params instead of failing", () => {
    expect(learningFilterSchema.parse({ track: "nope", due: "yes", q: "dp" })).toEqual({
      q: "dp",
      due: false,
    });
    expect(learningFilterSchema.parse({ due: "1" }).due).toBe(true);
  });
});
