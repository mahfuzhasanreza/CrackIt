import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const DB = "postgresql://crackit:crackit@localhost:5433/crackit";

let parseServerEnv: typeof import("./env").parseServerEnv;

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", DB); // the module validates process.env on import
  ({ parseServerEnv } = await import("./env"));
});

describe("parseServerEnv", () => {
  it("accepts a minimal valid env and defaults NODE_ENV", () => {
    const env = parseServerEnv({ DATABASE_URL: DB });
    expect(env.NODE_ENV).toBe("development");
    expect(env.DIRECT_URL).toBeUndefined();
  });

  it("requires DATABASE_URL", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects non-postgres URLs", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://x" })).toThrow(/postgres/);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseServerEnv({ DATABASE_URL: DB, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
