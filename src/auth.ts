import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authRepository } from "@/modules/auth/repository";
import { createAuthService } from "@/modules/auth/service";
import { dummyVerify, verifyPassword } from "@/modules/auth/password";
import { loginSchema } from "@/modules/auth/validators";

const authService = createAuthService({
  repo: authRepository,
  passwords: { verify: verifyPassword, dummyVerify },
});

class InvalidCredentials extends CredentialsSignin {
  code = "invalid_credentials";
}
class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Vercel (and `next start` behind our own proxy) sets the host headers we rely on.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  logger: {
    // Failed logins are expected (and recorded in login_attempts); don't log stack traces.
    error(error) {
      if (error.name === "CredentialsSignin" || error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidCredentials();

        const result = await authService.verifyCredentials(parsed.data, clientIp(request));
        if (!result.ok) {
          throw result.error.code === "RATE_LIMITED" ? new RateLimited() : new InvalidCredentials();
        }
        return result.data;
      },
    }),
  ],
  callbacks: {
    /**
     * Runs in proxy.ts: optimistic check only (JWT present and signed). /login is always
     * reachable — it must be, because a signed JWT can still be stale (e.g. after a password
     * reset), and only the DAL can tell. The login page itself redirects valid sessions away.
     */
    authorized({ auth, request: { nextUrl } }) {
      if (nextUrl.pathname === "/login") return true;
      return Boolean(auth?.user); // false → redirect to /login?callbackUrl=...
    },
    jwt({ token, user }) {
      if (user) token.sessionVersion = user.sessionVersion ?? 0; // only on sign-in
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.sessionVersion =
        typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      return session;
    },
  },
});
