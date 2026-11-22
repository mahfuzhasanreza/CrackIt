/**
 * The guest account: "Continue as guest" on the login page signs anyone into one shared account
 * filled with demo data. It is never deleted and has no password (nobody can sign in to it with
 * one), so only the guest button reaches it. Everyone who uses it sees everyone else's changes.
 * Account-level actions (profile, password, backup restore) are refused for it. Its email
 * domain is reserved: sign-up refuses it. Pure helpers only (safe on server and client).
 */
export const GUEST_EMAIL_DOMAIN = "guest.crackit.local";
export const GUEST_EMAIL = `guest@${GUEST_EMAIL_DOMAIN}`;
export const GUEST_NAME = "Guest";
export const GUEST_TIMEZONE = "Asia/Dhaka";
export const GUEST_DAY_START_HOUR = 4;

export const GUEST_LOCKED_MESSAGE =
  "The shared guest account can't change this. Create your own account to use it.";

export function isGuestEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}
