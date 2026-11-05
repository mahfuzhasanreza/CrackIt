import "server-only";

import { db } from "@/lib/db";

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
