import { err, ok, type Result } from "@/lib/result";

import { isLoginLocked, LOGIN_WINDOW_MS } from "./rate-limit";
import type { LoginInput } from "./validators";

export type AuthUserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  sessionVersion: number;
};

/** What ends up in the session token. */
export type SessionUser = Pick<AuthUserRecord, "id" | "email" | "name" | "sessionVersion">;

export type AuthRepository = {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  countFailuresSince(by: { email: string } | { ip: string }, since: Date): Promise<number>;
  recordLoginAttempt(attempt: {
    email: string;
    ip: string | null;
    success: boolean;
  }): Promise<void>;
};

export type PasswordVerifier = {
  verify(passwordHash: string, plain: string): Promise<boolean>;
  dummyVerify(plain: string): Promise<void>;
};

export type AuthServiceDeps = {
  repo: AuthRepository;
  passwords: PasswordVerifier;
  now?: () => Date;
};

export function createAuthService({ repo, passwords, now = () => new Date() }: AuthServiceDeps) {
  return {
    /**
     * Check email + password with rate limiting. Never reveals whether the email exists.
     * `input` must already be validated/normalised by `loginSchema`.
     */
    async verifyCredentials(input: LoginInput, ip: string | null): Promise<Result<SessionUser>> {
      const since = new Date(now().getTime() - LOGIN_WINDOW_MS);
      const [emailFailures, ipFailures] = await Promise.all([
        repo.countFailuresSince({ email: input.email }, since),
        ip ? repo.countFailuresSince({ ip }, since) : Promise.resolve(0),
      ]);
      if (isLoginLocked({ email: emailFailures, ip: ipFailures })) {
        await repo.recordLoginAttempt({ email: input.email, ip, success: false });
        return err("RATE_LIMITED", "Too many failed attempts. Try again in 15 minutes.");
      }

      const user = await repo.findUserByEmail(input.email);
      let valid = false;
      if (user?.passwordHash) {
        valid = await passwords.verify(user.passwordHash, input.password);
      } else {
        await passwords.dummyVerify(input.password);
      }

      await repo.recordLoginAttempt({ email: input.email, ip, success: valid });
      if (!user || !valid) return err("UNAUTHORIZED", "Invalid email or password.");

      return ok({
        id: user.id,
        email: user.email,
        name: user.name,
        sessionVersion: user.sessionVersion,
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
