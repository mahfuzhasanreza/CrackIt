import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const loginSchema = z.object({
  email: emailSchema,
  // No strength rules at login — just bound the size before hashing.
  password: z.string().min(1, "Enter your password").max(256),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const PASSWORD_MIN_LENGTH = 12;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, "Use at most 128 characters");

/**
 * Turn an untrusted post-login redirect target into a same-origin path.
 * Accepts relative paths ("/timer?x=1") and absolute URLs on `origin`
 * (Auth.js/proxy passes callbackUrl as an absolute URL). Anything else → fallback.
 */
export function safeRedirectPath(value: unknown, origin: string, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value === "") return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== new URL(origin).origin) return fallback;
  if (url.pathname === "/login" || url.pathname.startsWith("/api/")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export const registerSchema = z
  .object({
    name: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(80, "Keep it under 80 characters").optional(),
    ),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((r) => r.password === r.confirmPassword, {
    path: ["confirmPassword"],
    message: "Doesn't match",
  });
export type RegisterInput = z.infer<typeof registerSchema>;
