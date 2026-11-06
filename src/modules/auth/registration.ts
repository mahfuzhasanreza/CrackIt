import "server-only";

import { err, ok, type Result } from "@/lib/result";

import { hashPassword } from "./password";
import { MAX_SIGNUPS_PER_IP, SIGNUP_WINDOW_MS } from "./rate-limit";
import * as repo from "./repository";
import type { RegisterInput } from "./validators";

const taken = () =>
  err("CONFLICT", "An account with this email already exists. Log in instead.", {
    email: ["Already registered"],
  });

/**
 * Open registration: create the account with the starter tracks, topics and activities.
 * Rate-limited per IP (every attempt counts). The caller signs the new user in.
 */
export async function registerUser(
  input: RegisterInput,
  ip: string | null,
  now = new Date(),
): Promise<Result<{ id: string }>> {
  if (ip) {
    const recent = await repo.countSignupAttemptsSince(
      ip,
      new Date(now.getTime() - SIGNUP_WINDOW_MS),
    );
    if (recent >= MAX_SIGNUPS_PER_IP) {
      return err("RATE_LIMITED", "Too many sign-ups from your network. Try again in an hour.");
    }
  }
  const record = (success: boolean) =>
    repo.recordSignupAttempt({ ip, email: input.email, success });

  if (await repo.emailTaken(input.email)) {
    await record(false);
    return taken();
  }
  try {
    const user = await repo.createUserWithDefaults({
      email: input.email,
      name: input.name ?? null,
      passwordHash: await hashPassword(input.password),
    });
    await record(true);
    return ok(user);
  } catch (e) {
    // Two sign-ups for the same email at once: the unique index decides.
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      await record(false);
      return taken();
    }
    throw e;
  }
}
