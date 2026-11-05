import { z } from "zod";

import { isValidDateKey } from "@/lib/dates";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const id = z.uuid("Invalid id");
const title = z.string().trim().min(1, "Give it a title").max(200, "Keep it under 200 characters");

export const CHECKLIST_TYPES = ["ROADMAP", "ONE_OFF", "HABIT"] as const;
export const HABIT_RECURRENCES = ["DAILY", "WEEKLY"] as const;

/** New list. Recurrence only applies to habits (and is required for them). */
export const createChecklistSchema = z
  .object({
    title,
    description: optional(z.string().trim().max(1000)),
    type: z.enum(CHECKLIST_TYPES),
    recurrence: optional(z.enum(HABIT_RECURRENCES)),
    trackId: optional(id),
  })
  .transform(({ recurrence, ...rest }) => ({
    ...rest,
    recurrence: rest.type === "HABIT" ? (recurrence ?? "DAILY") : ("NONE" as const),
  }));
export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;

/** Type and recurrence are fixed after creation (habit history depends on them). */
export const updateChecklistSchema = z.object({
  id,
  title,
  description: optional(z.string().trim().max(1000)),
  trackId: optional(id),
});
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;

export const itemFormSchema = z.object({
  checklistId: id,
  /** Present when editing. */
  id: optional(id),
  title,
  dueOn: optional(z.string().refine(isValidDateKey, "Pick a valid date")),
  priority: optional(z.coerce.number().int().min(0).max(2)).transform((v) => v ?? 0),
});
export type ItemFormInput = z.infer<typeof itemFormSchema>;

export const toggleItemSchema = z.object({
  id,
  done: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const moveItemSchema = z.object({ id, direction: z.enum(["up", "down"]) });

export const idSchema = z.object({ id });
