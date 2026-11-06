import { z } from "zod";

import { isValidDateKey } from "@/lib/dates";

export const GOAL_METRICS = ["STUDY_MINUTES", "PROBLEMS_SOLVED", "LEARNING_ENTRIES"] as const;
export const GOAL_PERIODS = ["DAY", "WEEK", "MONTH"] as const;

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    schema.optional(),
  );
const dateKey = z.string().refine(isValidDateKey, "Pick a valid date");

/**
 * The form asks for hours for study goals (e.g. "1.5") and a count otherwise; `target` is
 * stored as minutes / a count.
 */
export const goalFormSchema = z
  .object({
    id: optional(z.uuid()),
    metric: z.enum(GOAL_METRICS),
    period: z.enum(GOAL_PERIODS),
    target: z.coerce
      .number({ message: "Enter a number" })
      .positive("Must be more than 0")
      .max(10_000, "That's too many"),
    trackId: optional(z.uuid()),
    startsOn: dateKey,
    endsOn: optional(dateKey),
  })
  .superRefine((g, ctx) => {
    if (g.metric !== "STUDY_MINUTES" && !Number.isInteger(g.target)) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "Enter a whole number" });
    }
    if (g.metric === "STUDY_MINUTES" && g.target * 60 > 24 * 60 * 31) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "More hours than the period has" });
    }
    if (g.endsOn && g.endsOn < g.startsOn) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "Ends before it starts" });
    }
  })
  .transform(({ target, trackId, ...g }) => ({
    ...g,
    // Only study time is tracked per track.
    trackId: g.metric === "STUDY_MINUTES" ? trackId : undefined,
    target: g.metric === "STUDY_MINUTES" ? Math.round(target * 60) : target,
  }));
export type GoalFormInput = z.infer<typeof goalFormSchema>;

export const goalIdSchema = z.object({ id: z.uuid() });
