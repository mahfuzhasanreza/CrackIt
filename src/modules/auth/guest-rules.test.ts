import { describe, expect, it } from "vitest";

import {
  GUEST_TTL_MS,
  guestCutoff,
  guestEmail,
  guestExpiresAt,
  guestTimeLeft,
  isGuestEmail,
} from "./guest-rules";
import { registerSchema } from "./validators";

const created = new Date("2026-11-20T10:00:00Z");
const after = (ms: number) => new Date(created.getTime() + ms);
const H = 3_600_000;

describe("guest emails", () => {
  it("uses the reserved domain and recognises it in any case", () => {
    const email = guestEmail("abc");
    expect(email).toBe("guest-abc@guest.crackit.local");
    expect(isGuestEmail(email)).toBe(true);
    expect(isGuestEmail(" GUEST-ABC@Guest.CrackIt.Local ")).toBe(true);
    expect(isGuestEmail("me@crackit.local")).toBe(false);
    expect(isGuestEmail("guest.crackit.local@example.com")).toBe(false);
  });

  it("can't be used to sign up", () => {
    const form = { password: "a-long-password-1", confirmPassword: "a-long-password-1" };
    const r = registerSchema.safeParse({ ...form, email: "Someone@guest.crackit.local" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.email).toBeDefined();
  });
});

describe("guest expiry", () => {
  it("expires 24 hours after creation", () => {
    expect(guestExpiresAt(created)).toEqual(after(GUEST_TTL_MS));
    expect(guestCutoff(after(GUEST_TTL_MS))).toEqual(created);
  });

  it("says how long is left", () => {
    expect(guestTimeLeft(created, created)).toBe("in 24 hours");
    expect(guestTimeLeft(created, after(22.5 * H))).toBe("in 1 hour");
    expect(guestTimeLeft(created, after(23.5 * H))).toBe("in 30 minutes");
    expect(guestTimeLeft(created, after(24 * H - 59_000))).toBe("soon");
    expect(guestTimeLeft(created, after(25 * H))).toBe("soon");
  });
});
