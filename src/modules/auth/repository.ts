import "server-only";

import { db } from "@/lib/db";

import { seedDefaultsForUser } from "../../../prisma/seed-defaults";

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
