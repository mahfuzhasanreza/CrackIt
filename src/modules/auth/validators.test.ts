import { describe, expect, it } from "vitest";

import { loginSchema, newPasswordSchema, safeRedirectPath } from "./validators";

describe("loginSchema", () => {
  it("trims and lower-cases the email", () => {
    expect(loginSchema.parse({ email: "  Me@Example.COM ", password: "x" }).email).toBe(
      "me@example.com",
    );
  });

  it("rejects invalid emails and empty passwords", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = r.error.flatten().fieldErrors;
      expect(fields.email).toBeDefined();
      expect(fields.password).toBeDefined();
    }
  });
});

describe("newPasswordSchema", () => {
  it("requires at least 12 characters", () => {
    expect(newPasswordSchema.safeParse("short-pass1").success).toBe(false);
    expect(newPasswordSchema.safeParse("long-enough-pass").success).toBe(true);
  });
});

describe("safeRedirectPath", () => {
  const origin = "https://crackit.app";
  it.each([
    ["/timer", "/timer"],
    ["/journal?date=2026-11-05", "/journal?date=2026-11-05"],
    ["https://crackit.app/timeline?d=1", "/timeline?d=1"],
    ["https://evil.com/dashboard", "/dashboard"],
    ["//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["/login", "/dashboard"],
    ["/api/auth/signout", "/dashboard"],
    ["", "/dashboard"],
    [null, "/dashboard"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirectPath(input, origin)).toBe(expected);
  });
});
