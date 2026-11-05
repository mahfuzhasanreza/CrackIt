import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const DB = "postgresql://crackit:crackit@localhost:5433/crackit";
const SECRET = "x".repeat(32);
const valid = { DATABASE_URL: DB, AUTH_SECRET: SECRET };

let parseServerEnv: typeof import("./env").parseServerEnv;

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", DB); // the module validates process.env on import
  vi.stubEnv("AUTH_SECRET", SECRET);
  ({ parseServerEnv } = await import("./env"));
});

describe("parseServerEnv", () => {
  it("accepts a minimal valid env and defaults NODE_ENV", () => {
    const env = parseServerEnv(valid);
    expect(env.NODE_ENV).toBe("development");
    expect(env.DIRECT_URL).toBeUndefined();
  });

  it("requires DATABASE_URL and AUTH_SECRET", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL[\s\S]*AUTH_SECRET/);
  });

  it("rejects a short AUTH_SECRET", () => {
    expect(() => parseServerEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("rejects non-postgres URLs", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://x" })).toThrow(/postgres/);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseServerEnv({ ...valid, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
