import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { verifyPassword } from "./password";
import { MAX_SIGNUPS_PER_IP } from "./rate-limit";
import { registerUser } from "./registration";
import { registerSchema } from "./validators";

const input = (email = `signup-${randomUUID()}@crackit.local`) =>
  registerSchema.parse({
    name: "New Person",
    email: email.toUpperCase(), // stored lower-cased
    password: "a-long-password-1",
    confirmPassword: "a-long-password-1",
  });

describe("registration", () => {
  it("creates the account with the starter tracks, topics and activities", async () => {
    const data = input();
    const result = await registerUser(data, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const user = await db.user.findUniqueOrThrow({ where: { id: result.data.id } });
    expect(user.email).toBe(data.email.toLowerCase());
    expect(user.name).toBe("New Person");
    expect(await verifyPassword(user.passwordHash!, "a-long-password-1")).toBe(true);
    expect(await db.track.count({ where: { userId: user.id } })).toBe(2);
    expect(await db.topic.count({ where: { userId: user.id } })).toBeGreaterThan(20);
    expect(await db.activityType.count({ where: { userId: user.id } })).toBeGreaterThan(5);
  });

  it("refuses a taken email, whatever its case", async () => {
    const email = `taken-${randomUUID()}@crackit.local`;
    expect((await registerUser(input(email), null)).ok).toBe(true);
    const again = await registerUser(input(email.toUpperCase()), null);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("CONFLICT");
  });

  it("limits sign-ups per IP", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 250)}-${randomUUID()}`;
    for (let i = 0; i < MAX_SIGNUPS_PER_IP; i++) {
      expect((await registerUser(input(), ip)).ok).toBe(true);
    }
    const blocked = await registerUser(input(), ip);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe("RATE_LIMITED");
    // Older attempts fall out of the window.
    const later = new Date(Date.now() + 61 * 60_000);
    expect((await registerUser(input(), ip, later)).ok).toBe(true);
  });

  it("validates the form", () => {
    const base = {
      email: "a@b.co",
      password: "a-long-password-1",
      confirmPassword: "a-long-password-1",
    };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, confirmPassword: "nope" }).success).toBe(false);
    expect(
      registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });
});
