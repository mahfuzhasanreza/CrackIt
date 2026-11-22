import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { err, ok, type Result } from "@/lib/result";

import { isValidTimeZone } from "../settings/validators";

import {
  DEFAULT_GUEST_TIMEZONE,
  GUEST_WINDOW_MS,
  guestCutoff,
  guestEmail,
  guestTimeLeft,
  isGuestEmail,
  MAX_GUESTS_PER_IP,
} from "./guest-rules";
import { hashPassword } from "./password";
import * as repo from "./repository";

export type GuestCredentials = { email: string; password: string };

/**
 * A fresh guest account filled with demo data. Rate-limited per IP; also deletes guests that
 * have expired. The password is random and never shown: the caller signs straight in with
 * these credentials, and when the session ends the account is unreachable.
 */
export async function createGuest(
  ip: string | null,
  timezone: unknown,
  now = new Date(),
): Promise<Result<GuestCredentials>> {
  if (ip) {
    const recent = await repo.countGuestSignupsSince(ip, new Date(now.getTime() - GUEST_WINDOW_MS));
    if (recent >= MAX_GUESTS_PER_IP) {
      return err(
        "RATE_LIMITED",
        "Too many guest sessions from your network. Try again in an hour.",
      );
    }
  }
  await repo.deleteGuestsCreatedBefore(guestCutoff(now));

  const email = guestEmail(randomUUID());
  const password = randomBytes(24).toString("base64url");
  await repo.createGuestUser({
    email,
    passwordHash: await hashPassword(password),
    timezone:
      typeof timezone === "string" && isValidTimeZone(timezone) ? timezone : DEFAULT_GUEST_TIMEZONE,
    now,
  });
  await repo.recordSignupAttempt({ ip, email, success: true });
  return ok({ email, password });
}

/** For a guest: how long their account has left (e.g. "in 23 hours"); null for real users. */
export async function guestTimeRemaining(
  user: { id: string; email: string },
  now = new Date(),
): Promise<string | null> {
  if (!isGuestEmail(user.email)) return null;
  const row = await repo.findUserCreatedAt(user.id);
  return row ? guestTimeLeft(row.createdAt, now) : null;
}
