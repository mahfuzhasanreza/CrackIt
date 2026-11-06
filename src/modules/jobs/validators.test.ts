import { describe, expect, it } from "vitest";

import { interviewFormSchema, outcomeSchema } from "./validators";

const base = { round: "TECHNICAL", scheduledAt: "2026-11-10T15:00" };
const appId = "0196f0c4-1a2b-7c3d-8e4f-123456789abc";

describe("interview form", () => {
  it("takes an existing application or a new organization + role", () => {
    expect(interviewFormSchema.safeParse({ ...base, applicationId: appId }).success).toBe(true);
    expect(
      interviewFormSchema.safeParse({ ...base, newOrganizationName: "Initech", newRole: "SWE" })
        .success,
    ).toBe(true);
    const missing = interviewFormSchema.safeParse({ ...base, newOrganizationName: "Initech" });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error.flatten().fieldErrors.newRole).toBeTruthy();
    expect(interviewFormSchema.safeParse(base).success).toBe(false);
  });

  it("editing doesn't need the application again", () => {
    expect(interviewFormSchema.safeParse({ ...base, id: appId }).success).toBe(true);
  });

  it("quick outcomes", () => {
    expect(outcomeSchema.safeParse({ id: appId, outcome: "PASSED", selfRating: "4" }).success).toBe(
      true,
    );
    expect(outcomeSchema.safeParse({ id: appId, outcome: "MAYBE" }).success).toBe(false);
  });
});
