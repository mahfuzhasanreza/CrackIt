import { describe, expect, it } from "vitest";

import { canOfferInstall } from "./install-prompt";

describe("install button", () => {
  const base = { hasPrompt: true, installed: false, standalone: false };

  it("shows only when the browser offers installing and the app isn't installed", () => {
    expect(canOfferInstall(base)).toBe(true);
    expect(canOfferInstall({ ...base, hasPrompt: false })).toBe(false); // Safari, Firefox, or installed
    expect(canOfferInstall({ ...base, installed: true })).toBe(false); // just installed
    expect(canOfferInstall({ ...base, standalone: true })).toBe(false); // running as the app
  });
});
