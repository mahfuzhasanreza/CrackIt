/**
 * Guest accounts: "Continue as guest" on the login page creates a throwaway account with demo
 * data. Each visitor gets their own (nobody sees anyone else's changes), and it is deleted
 * after GUEST_TTL_MS. Guests are recognised by their reserved email domain, which sign-up
 * refuses. Pure helpers only (safe on server and client).
 */
export const GUEST_EMAIL_DOMAIN = "guest.crackit.local";
export const GUEST_TTL_MS = 24 * 60 * 60 * 1000;
export const GUEST_NAME = "Guest";
export const DEFAULT_GUEST_TIMEZONE = "Asia/Dhaka";

/** At most 10 guest accounts per IP per hour. */
export const GUEST_WINDOW_MS = 60 * 60 * 1000;
export const MAX_GUESTS_PER_IP = 10;

export function guestEmail(id: string): string {
  return `guest-${id}@${GUEST_EMAIL_DOMAIN}`;
}

export function isGuestEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

/** Guests created before this instant have expired. */
export function guestCutoff(now: Date): Date {
  return new Date(now.getTime() - GUEST_TTL_MS);
}

/** When a guest account created at `createdAt` is deleted. */
export function guestExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + GUEST_TTL_MS);
}

/** "in 23 hours" / "in 40 minutes" / "soon": how long a guest account has left. */
export function guestTimeLeft(createdAt: Date, now: Date): string {
  const ms = guestExpiresAt(createdAt).getTime() - now.getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.floor(ms / 60_000);
  if (minutes >= 1) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  return "soon";
}

/** Cookie remembering that a guest closed the guest notice ("1" = closed). */
export const GUEST_BANNER_COOKIE = "crackit-guest-banner-closed";
