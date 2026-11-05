import { describe, expect, it } from "vitest";

import { statusAfterInterview, transition } from "./rules";

const TODAY = "2026-11-05";

describe("transition", () => {
  it("leaving the wishlist records the applied date and an event", () => {
    expect(transition({ status: "WISHLIST", appliedOn: null }, "APPLIED", TODAY)).toEqual({
      status: "APPLIED",
      appliedOn: TODAY,
      event: { from: "WISHLIST", to: "APPLIED" },
    });
  });

  it("keeps an existing applied date", () => {
    expect(
      transition({ status: "APPLIED", appliedOn: "2026-10-01" }, "INTERVIEWING", TODAY).appliedOn,
    ).toBe("2026-10-01");
  });

  it("same status is a no-op", () => {
    expect(transition({ status: "OA", appliedOn: TODAY }, "OA", TODAY).event).toBeNull();
  });

  it("back to the wishlist keeps the date it had", () => {
    expect(transition({ status: "APPLIED", appliedOn: "2026-10-01" }, "WISHLIST", TODAY)).toEqual({
      status: "WISHLIST",
      appliedOn: "2026-10-01",
      event: { from: "APPLIED", to: "WISHLIST" },
    });
  });
});

describe("statusAfterInterview", () => {
  it("OA rounds move early applications to OA", () => {
    expect(statusAfterInterview("APPLIED", "OA")).toBe("OA");
    expect(statusAfterInterview("INTERVIEWING", "OA")).toBe("INTERVIEWING");
  });

  it("other rounds move to interviewing", () => {
    expect(statusAfterInterview("WISHLIST", "TECHNICAL")).toBe("INTERVIEWING");
    expect(statusAfterInterview("OA", "HR")).toBe("INTERVIEWING");
  });

  it("never reopens offers or closed applications", () => {
    expect(statusAfterInterview("OFFER", "HR")).toBe("OFFER");
    expect(statusAfterInterview("REJECTED", "TECHNICAL")).toBe("REJECTED");
    expect(statusAfterInterview("WITHDRAWN", "OA")).toBe("WITHDRAWN");
  });
});
