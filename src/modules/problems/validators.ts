import { z } from "zod";

import { parseTags } from "@/lib/tags";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const id = z.uuid("Invalid id");
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const PLATFORMS = [
  "LEETCODE",
  "CODEFORCES",
  "HACKERRANK",
  "ATCODER",
  "GEEKSFORGEEKS",
  "CODECHEF",
  "OTHER",
] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const STATUSES = ["TODO", "ATTEMPTED", "SOLVED", "NEEDS_REVISION"] as const;

const patterns = z
  .string()
  .default("")
  .transform((raw, ctx) => {
    const parsed = parseTags(raw);
    if (parsed.ok) return parsed.data;
    ctx.addIssue({ code: "custom", message: parsed.error.message });
    return z.NEVER;
  });

export const problemFormSchema = z.object({
  /** Present when editing. */
  id: optional(id),
  title: z.string().trim().min(1, "Give it a title").max(200, "Keep it under 200 characters"),
  platform: z.enum(PLATFORMS),
  url: optional(z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).max(2000)),
  difficulty: z.enum(DIFFICULTIES),
  status: z.enum(STATUSES),
  tags: patterns,
  topicId: optional(id),
  timeSpentMin: optional(z.coerce.number().int().min(0).max(100_000)).transform((v) => v ?? 0),
  notesMd: z.string().max(20_000, "Keep notes under 20,000 characters").default(""),
  scheduleReview: checkbox,
});
export type ProblemFormInput = z.infer<typeof problemFormSchema>;

export const attemptSchema = z.object({
  id,
  minutes: z.coerce.number().int().min(0, "Can't be negative").max(1440, "At most 24 hours"),
  solved: checkbox,
});

export const reviewSchema = z.object({ id, outcome: z.enum(["remembered", "forgot"]) });

export const idSchema = z.object({ id });

/** /problems search params; invalid values are ignored. */
export const problemFilterSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(STATUSES).optional().catch(undefined),
  difficulty: z.enum(DIFFICULTIES).optional().catch(undefined),
  platform: z.enum(PLATFORMS).optional().catch(undefined),
  tag: z.string().trim().max(32).optional().catch(undefined),
});
export type ProblemFilter = z.infer<typeof problemFilterSchema>;
