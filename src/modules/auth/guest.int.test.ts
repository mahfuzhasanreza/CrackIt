import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createGuest, guestTimeRemaining } from "./guest";
import { GUEST_TTL_MS, guestEmail, isGuestEmail, MAX_GUESTS_PER_IP } from "./guest-rules";
import { verifyPassword } from "./password";
import { registerUser } from "./registration";
import { registerSchema } from "./validators";

const uniqueIp = () => `198.51.100.${randomUUID()}`;

async function guestUser(email: string) {
  return db.user.findUniqueOrThrow({ where: { email } });
}

describe("guest accounts", () => {
  it("creates a separate account filled with demo data, signed in with a random password", async () => {
    const a = await createGuest(uniqueIp(), "Europe/Berlin");
    const b = await createGuest(uniqueIp(), "Europe/Berlin");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    expect(isGuestEmail(a.data.email)).toBe(true);
    expect(a.data.email).not.toBe(b.data.email);
    const user = await guestUser(a.data.email);
    expect(user.name).toBe("Guest");
    expect(user.timezone).toBe("Europe/Berlin");
    expect(await verifyPassword(user.passwordHash!, a.data.password)).toBe(true);

    const where = { userId: user.id };
    expect(await db.track.count({ where })).toBe(2);
    expect(await db.timeEntry.count({ where: { ...where, endedAt: null } })).toBe(1);
    expect(await db.timeEntry.count({ where })).toBeGreaterThan(500);
    expect(await db.application.count({ where })).toBeGreaterThan(5);
    expect(await db.interview.count({ where })).toBeGreaterThan(5);
    expect(await db.problem.count({ where })).toBeGreaterThan(10);
    expect(await db.learningEntry.count({ where })).toBeGreaterThan(5);
    expect(await db.goal.count({ where })).toBeGreaterThan(0);
  });

  it("falls back to the default time zone when the browser sends nonsense", async () => {
    const r = await createGuest(uniqueIp(), "Not/AZone");
    expect(r.ok).toBe(true);
    if (r.ok) expect((await guestUser(r.data.email)).timezone).toBe("Asia/Dhaka");
  });

  it("deletes guests older than 24 hours (with their data) when a new one is created", async () => {
    const old = await createGuest(uniqueIp(), "UTC");
    if (!old.ok) throw new Error("guest not created");
    const user = await guestUser(old.data.email);

    const later = new Date(user.createdAt.getTime() + GUEST_TTL_MS + 1000);
    await createGuest(uniqueIp(), "UTC", later);
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await db.timeEntry.count({ where: { userId: user.id } })).toBe(0);
  });

  it("keeps real users, however old", async () => {
    const real = await db.user.create({
      data: { email: `old-${randomUUID()}@crackit.local`, createdAt: new Date("2020-01-01") },
    });
    await createGuest(uniqueIp(), "UTC");
    expect(await db.user.findUnique({ where: { id: real.id } })).not.toBeNull();
  });

  it("limits guests per IP, separately from sign-ups", async () => {
    const ip = uniqueIp();
    // Earlier guests from this IP (as recorded by createGuest).
    await db.signupAttempt.createMany({
      data: Array.from({ length: MAX_GUESTS_PER_IP }, () => ({
        ip,
        email: guestEmail(randomUUID()),
        success: true,
      })),
    });
    const blocked = await createGuest(ip, "UTC");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe("RATE_LIMITED");

    // Guest accounts don't use up the sign-up allowance.
    const form = registerSchema.parse({
      email: `real-${randomUUID()}@crackit.local`,
      password: "a-long-password-1",
      confirmPassword: "a-long-password-1",
    });
    expect((await registerUser(form, ip)).ok).toBe(true);

    // Older attempts fall out of the window.
    const later = new Date(Date.now() + 61 * 60_000);
    expect((await createGuest(ip, "UTC", later)).ok).toBe(true);
  });

  it("tells guests how long they have left, and nobody else", async () => {
    const r = await createGuest(uniqueIp(), "UTC");
    if (!r.ok) throw new Error("guest not created");
    const user = await guestUser(r.data.email);
    expect(await guestTimeRemaining(user, user.createdAt)).toBe("in 24 hours");

    const real = await db.user.create({ data: { email: `real-${randomUUID()}@crackit.local` } });
    expect(await guestTimeRemaining(real)).toBeNull();
  });
});
