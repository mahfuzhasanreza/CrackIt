import { z } from "zod";

import { newPasswordSchema } from "../auth/validators";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    schema.optional(),
  );
const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a color");
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  name: optional(z.string().trim().max(80, "Keep it under 80 characters")),
  timezone: z.string().refine(isValidTimeZone, "Pick a time zone"),
  dayStartHour: z.coerce.number().int().min(0, "0–12").max(12, "0–12"),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(256),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((p) => p.newPassword === p.confirmPassword, {
    path: ["confirmPassword"],
    message: "Doesn't match",
  })
  .refine((p) => p.newPassword !== p.currentPassword, {
    path: ["newPassword"],
    message: "Use a different password",
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const trackSchema = z.object({
  id: optional(z.uuid()),
  name: z.string().trim().min(1, "Give it a name").max(60, "Keep it under 60 characters"),
  description: optional(z.string().trim().max(200, "Keep it under 200 characters")),
  color: hex,
  /** Hours per week in the form; stored as minutes. */
  weeklyTargetHours: optional(
    z.coerce
      .number({ message: "Enter a number" })
      .min(0, "Can't be negative")
      .max(168, "A week has 168h"),
  ),
  isActive: checkbox,
});
export type TrackInput = z.infer<typeof trackSchema>;

export const ACTIVITY_CATEGORIES = [
  "STUDY",
  "SLEEP",
  "BREAK",
  "WORK",
  "EXERCISE",
  "PERSONAL",
  "OTHER",
] as const;

export const activityTypeSchema = z.object({
  id: optional(z.uuid()),
  name: z.string().trim().min(1, "Give it a name").max(40, "Keep it under 40 characters"),
  color: hex,
  category: z.enum(ACTIVITY_CATEGORIES),
  isProductive: checkbox,
  isArchived: checkbox,
});
export type ActivityTypeInput = z.infer<typeof activityTypeSchema>;

export const idSchema = z.object({ id: z.uuid() });
export const moveSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });
