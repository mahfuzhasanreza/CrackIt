/** Lock an email after 5 failed logins in 15 minutes; an IP after 20 (any emails). */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 20;

export function isLoginLocked(failures: { email: number; ip: number }): boolean {
  return failures.email >= MAX_FAILURES_PER_EMAIL || failures.ip >= MAX_FAILURES_PER_IP;
}
