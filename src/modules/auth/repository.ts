import "server-only";

import { db } from "@/lib/db";

import { seedDemoData } from "../../../prisma/demo-data";
import { seedDefaultsForUser } from "../../../prisma/seed-defaults";

import { GUEST_DAY_START_HOUR, GUEST_EMAIL, GUEST_NAME, GUEST_TIMEZONE } from "./guest-rules";
import type { AuthRepository } from "./service";

export const authRepository: AuthRepository = {
  findUserByEmail(email) {
    return db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, sessionVersion: true },
    });
  },

  countFailuresSince(by, since) {
    return db.loginAttempt.count({ where: { ...by, success: false, createdAt: { gte: since } } });
  },

  async recordLoginAttempt(attempt) {
    await db.loginAttempt.create({ data: attempt });
  },
};

/** Fields the app needs about the signed-in user (no secrets). */
export function findSessionUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      dayStartHour: true,
      sessionVersion: true,
    },
  });
}

// ── Registration ────────────────────────────────────────────────────────────

export function emailTaken(email: string) {
  return db.user.findUnique({ where: { email }, select: { id: true } });
}

/** Sign-up attempts from an IP. */
export function countSignupAttemptsSince(ip: string, since: Date) {
  return db.signupAttempt.count({ where: { ip, createdAt: { gte: since } } });
}

export async function recordSignupAttempt(attempt: {
  ip: string | null;
  email: string;
  success: boolean;
}) {
  await db.signupAttempt.create({ data: attempt });
}

/** New user with the default activity types; tracks are theirs to choose (no starter tracks). */
export async function createUserWithDefaults(data: {
  email: string;
  name: string | null;
  passwordHash: string;
}) {
  const user = await db.user.create({ data, select: { id: true } });
  await seedDefaultsForUser(db, user.id);
  return user;
}

// ── Guest ───────────────────────────────────────────────────────────────────

const GUEST_SESSION_FIELDS = { id: true, email: true, name: true, sessionVersion: true } as const;

export function findGuest() {
  return db.user.findUnique({ where: { email: GUEST_EMAIL }, select: GUEST_SESSION_FIELDS });
}

/**
 * The shared guest (no password), filled with demo data; removed again if filling it fails.
 * Two first visitors at once: the loser's insert hits the unique email and it reads the winner's.
 */
export async function createGuest(now: Date) {
  let user;
  try {
    user = await db.user.create({
      data: {
        email: GUEST_EMAIL,
        name: GUEST_NAME,
        timezone: GUEST_TIMEZONE,
        dayStartHour: GUEST_DAY_START_HOUR,
      },
      select: GUEST_SESSION_FIELDS,
    });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      const existing = await findGuest();
      if (existing) return existing;
    }
    throw e;
  }
  try {
    await seedDemoData(db, user.id, {
      timezone: GUEST_TIMEZONE,
      dayStartHour: GUEST_DAY_START_HOUR,
      now,
      runningTimer: false, // it would run on for as long as the account exists
    });
  } catch (e) {
    await db.user.delete({ where: { id: user.id } });
    throw e;
  }
  return user;
}
