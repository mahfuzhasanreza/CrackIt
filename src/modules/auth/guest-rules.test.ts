import { describe, expect, it } from "vitest";

import { GUEST_EMAIL, isGuestEmail } from "./guest-rules";

describe("isGuestEmail", () => {
  it("recognises the reserved guest domain, whatever the case or spacing", () => {
    expect(isGuestEmail(GUEST_EMAIL)).toBe(true);
    expect(isGuestEmail(" Someone@GUEST.crackit.local ")).toBe(true);
  });

  it("leaves everyone else alone", () => {
    expect(isGuestEmail("guest@crackit.local")).toBe(false);
    expect(isGuestEmail("me@guest.crackit.local.evil.com")).toBe(false);
  });
});
