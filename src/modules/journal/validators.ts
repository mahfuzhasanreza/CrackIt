import { z } from "zod";

import { isValidDateKey } from "@/lib/dates";

import { parseTags } from "@/lib/tags";

/** FormData sends "" for empty fields; treat that as "not provided". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const id = z.uuid("Invalid id");
const dateKey = z.string().refine(isValidDateKey, "Pick a valid date");
const rating = optional(z.coerce.number().int().min(1).max(5));
const clockTime = optional(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"));
const longText = optional(z.string().trim().max(5000, "Keep this under 5000 characters"));

export const dailyLogFormSchema = z.object({
  date: dateKey,
  mood: rating,
  energy: rating,
  sleepQuality: rating,
  bedTime: clockTime,
  wakeTime: clockTime,
  planForDay: longText,
  reflection: longText,
  wins: longText,
  blockers: longText,
});
export type DailyLogFormInput = z.infer<typeof dailyLogFormSchema>;

export const learningEntryFormSchema = z.object({
  date: dateKey,
  trackId: optional(id),
  topicId: optional(id),
  title: z
    .string()
    .trim()
    .min(1, "Give it a title")
    .max(200, "Keep the title under 200 characters"),
  contentMd: z.string().max(20_000, "Keep notes under 20,000 characters").default(""),
  sourceUrl: optional(
    z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).max(2000),
  ),
  confidence: rating,
  tags: z
    .string()
    .default("")
    .transform((raw, ctx) => {
      const parsed = parseTags(raw);
      if (parsed.ok) return parsed.data;
      ctx.addIssue({ code: "custom", message: parsed.error.message });
      return z.NEVER;
    }),
  /** Checkbox: "on" when ticked, absent otherwise. */
  scheduleReview: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});
export type LearningEntryInput = z.infer<typeof learningEntryFormSchema>;

export const reviewSchema = z.object({
  id,
  outcome: z.enum(["remembered", "forgot"]),
});

/** /journal/learning search params. Invalid values are ignored rather than erroring. */
export const learningFilterSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  tag: z.string().trim().max(32).optional().catch(undefined),
  track: z.uuid().optional().catch(undefined),
  due: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
});
export type LearningFilter = z.infer<typeof learningFilterSchema>;
