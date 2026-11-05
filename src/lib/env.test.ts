import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parseServerEnv } = await import("./env");

describe("parseServerEnv", () => {
  it("defaults NODE_ENV to development", () => {
    expect(parseServerEnv({}).NODE_ENV).toBe("development");
  });

  it("throws a readable error for invalid values", () => {
    expect(() => parseServerEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
