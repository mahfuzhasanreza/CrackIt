import { describe, expect, it } from "vitest";

import { progressSchema, resourceFilterSchema, resourceFormSchema } from "./validators";

const base = { title: "Designing Data-Intensive Applications", type: "BOOK", status: "PLANNED" };

describe("resource validators", () => {
  it("treats blank optional fields as missing and blank progress as 0", () => {
    const r = resourceFormSchema.parse({
      ...base,
      url: "",
      totalUnits: "",
      completedUnits: "",
      unitLabel: " ",
    });
    expect(r).toMatchObject({ completedUnits: 0, notesMd: "" });
    expect(r.url).toBeUndefined();
    expect(r.totalUnits).toBeUndefined();
    expect(r.unitLabel).toBeUndefined();
  });

  it("rejects progress past the total, a zero total and non-http links", () => {
    expect(
      resourceFormSchema.safeParse({ ...base, totalUnits: "12", completedUnits: "13" }).success,
    ).toBe(false);
    expect(resourceFormSchema.safeParse({ ...base, totalUnits: "0" }).success).toBe(false);
    expect(resourceFormSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(resourceFormSchema.safeParse({ ...base, completedUnits: "2.5" }).success).toBe(false);
  });

  it("progress takes exactly one of an absolute count or a ±1 step", () => {
    const id = "0196f0c4-1a2b-7c3d-8e4f-123456789abc";
    expect(progressSchema.safeParse({ id, step: "1" }).success).toBe(true);
    expect(progressSchema.safeParse({ id, completed: "7" }).success).toBe(true);
    expect(progressSchema.safeParse({ id }).success).toBe(false);
    expect(progressSchema.safeParse({ id, step: "1", completed: "3" }).success).toBe(false);
    expect(progressSchema.safeParse({ id, step: "5" }).success).toBe(false);
  });

  it("falls back to the active view", () => {
    expect(resourceFilterSchema.parse({ view: "nope" }).view).toBe("active");
    expect(resourceFilterSchema.parse({}).view).toBe("active");
    expect(resourceFilterSchema.parse({ view: "done" }).view).toBe("done");
  });
});
