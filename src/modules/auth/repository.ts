import "server-only";

import { db } from "@/lib/db";

import { seedDemoData } from "../../../prisma/demo-data";
import { seedDefaultsForUser } from "../../../prisma/seed-defaults";

import { GUEST_EMAIL_DOMAIN, GUEST_NAME } from "./guest-rules";
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

const GUEST_EMAILS = { endsWith: `@${GUEST_EMAIL_DOMAIN}` };

/** Sign-up attempts from an IP (guest accounts don't count: they have their own limit). */
export function countSignupAttemptsSince(ip: string, since: Date) {
  return db.signupAttempt.count({
    where: { ip, createdAt: { gte: since }, NOT: { email: GUEST_EMAILS } },
  });
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

// ── Guests ──────────────────────────────────────────────────────────────────

export function countGuestSignupsSince(ip: string, since: Date) {
  return db.signupAttempt.count({ where: { ip, createdAt: { gte: since }, email: GUEST_EMAILS } });
}

/** Expired guests and everything they own (every table cascades from users). */
export async function deleteGuestsCreatedBefore(cutoff: Date) {
  const { count } = await db.user.deleteMany({
    where: { email: GUEST_EMAILS, createdAt: { lt: cutoff } },
  });
  return count;
}

/** A guest user filled with demo data; removed again if filling it fails. */
export async function createGuestUser(data: {
  email: string;
  passwordHash: string;
  timezone: string;
  now: Date;
}) {
  const dayStartHour = 4;
  const user = await db.user.create({
    data: {
      email: data.email,
      name: GUEST_NAME,
      passwordHash: data.passwordHash,
      timezone: data.timezone,
      dayStartHour,
    },
    select: { id: true },
  });
  try {
    await seedDemoData(db, user.id, { timezone: data.timezone, dayStartHour, now: data.now });
  } catch (e) {
    await db.user.delete({ where: { id: user.id } });
    throw e;
  }
  return user;
}

/** When the user's account was created (guests expire a fixed time after it). */
export function findUserCreatedAt(id: string) {
  return db.user.findUnique({ where: { id }, select: { createdAt: true } });
}
