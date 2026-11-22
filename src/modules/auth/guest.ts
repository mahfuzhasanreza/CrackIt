import "server-only";

import { err, ok, type Result } from "@/lib/result";

import { GUEST_LOCKED_MESSAGE, isGuestEmail } from "./guest-rules";
import * as repo from "./repository";
import type { SessionUser } from "./service";

/**
 * The shared guest account, created with demo data on the first "Continue as guest". Signed into
 * by the "guest" provider in `src/auth.ts` (no password).
 */
export async function getOrCreateGuest(now = new Date()): Promise<SessionUser> {
  return (await repo.findGuest()) ?? (await repo.createGuest(now));
}

/** Refuse account-level changes (profile, password, backup restore) for the shared guest. */
export function refuseGuest(user: { email: string }): Result<null> {
  return isGuestEmail(user.email) ? err("UNAUTHORIZED", GUEST_LOCKED_MESSAGE) : ok(null);
}
