import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_FAILURES_PER_EMAIL, MAX_FAILURES_PER_IP } from "./rate-limit";
import { type AuthRepository, type AuthUserRecord, createAuthService } from "./service";

const USER: AuthUserRecord = {
  id: "u1",
  email: "me@example.com",
  name: "Me",
  passwordHash: "hash-of-correct",
  sessionVersion: 3,
};

function setup(opts: { user?: AuthUserRecord | null; emailFails?: number; ipFails?: number } = {}) {
  const repo = {
    findUserByEmail: vi.fn(async (email: string) =>
      opts.user !== undefined ? opts.user : email === USER.email ? USER : null,
    ),
    countFailuresSince: vi.fn(async (by: { email: string } | { ip: string }) =>
      "email" in by ? (opts.emailFails ?? 0) : (opts.ipFails ?? 0),
    ),
    recordLoginAttempt: vi.fn(async () => {}),
  } satisfies AuthRepository;
  const passwords = {
    verify: vi.fn(async (hash: string, plain: string) => hash === `hash-of-${plain}`),
    dummyVerify: vi.fn(async () => {}),
  };
  const now = () => new Date("2026-11-05T10:00:00Z");
  const service = createAuthService({ repo, passwords, now });
  return { service, repo, passwords };
}

describe("authService.verifyCredentials", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("returns the session user for a correct password and records success", async () => {
    const r = await ctx.service.verifyCredentials(
      { email: USER.email, password: "correct" },
      "1.2.3.4",
    );
    expect(r).toEqual({
      ok: true,
      data: { id: "u1", email: USER.email, name: "Me", sessionVersion: 3 },
    });
    expect(ctx.repo.recordLoginAttempt).toHaveBeenCalledWith({
      email: USER.email,
      ip: "1.2.3.4",
      success: true,
    });
  });

  it("rejects a wrong password with a generic message and records failure", async () => {
    const r = await ctx.service.verifyCredentials({ email: USER.email, password: "nope" }, null);
    expect(r).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Invalid email or password." },
    });
    expect(ctx.repo.recordLoginAttempt).toHaveBeenCalledWith({
      email: USER.email,
      ip: null,
      success: false,
    });
  });

  it("gives the same answer for an unknown email and still spends hashing time", async () => {
    const r = await ctx.service.verifyCredentials(
      { email: "ghost@example.com", password: "x" },
      null,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe("Invalid email or password.");
    expect(ctx.passwords.dummyVerify).toHaveBeenCalledOnce();
    expect(ctx.passwords.verify).not.toHaveBeenCalled();
  });

  it("treats a user without a password as unable to log in", async () => {
    ctx = setup({ user: { ...USER, passwordHash: null } });
    const r = await ctx.service.verifyCredentials({ email: USER.email, password: "" }, null);
    expect(r.ok).toBe(false);
    expect(ctx.passwords.dummyVerify).toHaveBeenCalledOnce();
  });

  it("locks the email after too many failures, without checking the password", async () => {
    ctx = setup({ emailFails: MAX_FAILURES_PER_EMAIL });
    const r = await ctx.service.verifyCredentials(
      { email: USER.email, password: "correct" },
      "1.2.3.4",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("RATE_LIMITED");
    expect(ctx.passwords.verify).not.toHaveBeenCalled();
    expect(ctx.repo.recordLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it("allows one attempt below the email limit", async () => {
    ctx = setup({ emailFails: MAX_FAILURES_PER_EMAIL - 1 });
    const r = await ctx.service.verifyCredentials({ email: USER.email, password: "correct" }, null);
    expect(r.ok).toBe(true);
  });

  it("locks an IP after too many failures across emails", async () => {
    ctx = setup({ ipFails: MAX_FAILURES_PER_IP });
    const r = await ctx.service.verifyCredentials(
      { email: USER.email, password: "correct" },
      "9.9.9.9",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("RATE_LIMITED");
  });

  it("does not count IP failures when the IP is unknown", async () => {
    ctx = setup({ ipFails: 999 });
    const r = await ctx.service.verifyCredentials({ email: USER.email, password: "correct" }, null);
    expect(r.ok).toBe(true);
    expect(ctx.repo.countFailuresSince).toHaveBeenCalledTimes(1);
  });

  it("counts failures within the last 15 minutes", async () => {
    await ctx.service.verifyCredentials({ email: USER.email, password: "correct" }, null);
    expect(ctx.repo.countFailuresSince).toHaveBeenCalledWith(
      { email: USER.email },
      new Date("2026-11-05T09:45:00Z"),
    );
  });
});
