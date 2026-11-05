import { describe, expect, it } from "vitest";

import { parseStack, projectFormSchema } from "./validators";

describe("projects validators", () => {
  it("parses the stack, keeping case and dropping duplicates", () => {
    expect(parseStack("Next.js, PostgreSQL ,\n next.js,,  Tailwind  CSS")).toEqual([
      "Next.js",
      "PostgreSQL",
      "Tailwind CSS",
    ]);
  });

  it("validates links and limits", () => {
    const base = { name: "CrackIt", status: "BUILDING" };
    expect(projectFormSchema.parse({ ...base, repoUrl: "" }).repoUrl).toBeUndefined();
    expect(projectFormSchema.safeParse({ ...base, liveUrl: "ftp://x.y" }).success).toBe(false);
    expect(
      projectFormSchema.safeParse({
        ...base,
        stack: Array.from({ length: 21 }, (_, i) => `t${i}`).join(","),
      }).success,
    ).toBe(false);
  });
});
