import { describe, expect, it } from "vitest";

import { err, ok } from "./result";

describe("result helpers", () => {
  it("ok wraps data", () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 });
  });

  it("err carries code, message and field errors", () => {
    const r = err("VALIDATION", "Invalid input", { email: ["Required"] });
    expect(r).toEqual({
      ok: false,
      error: { code: "VALIDATION", message: "Invalid input", fieldErrors: { email: ["Required"] } },
    });
  });
});
