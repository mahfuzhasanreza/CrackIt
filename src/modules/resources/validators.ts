import { z } from "zod";

import { RESOURCE_STATUSES, RESOURCE_TYPES } from "./rules";

/** Blank (or whitespace-only) form values count as "not given". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    schema.optional(),
  );

const MAX_UNITS = 100_000;
const units = z.coerce
  .number({ message: "Enter a whole number" })
  .int("Enter a whole number")
  .max(MAX_UNITS, `At most ${MAX_UNITS.toLocaleString("en-US")}`);

export const resourceFormSchema = z
  .object({
    id: optional(z.uuid()),
    title: z.string().trim().min(1, "Give it a title").max(200, "Keep it under 200 characters"),
    author: optional(z.string().trim().max(120, "Keep it under 120 characters")),
    type: z.enum(RESOURCE_TYPES),
    url: optional(z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).max(2000)),
    trackId: optional(z.uuid()),
    unitLabel: optional(z.string().trim().max(30, "Keep it under 30 characters")),
    totalUnits: optional(units.min(1, "At least 1")),
    completedUnits: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? 0 : v),
      units.min(0, "Can't be negative"),
    ),
    status: z.enum(RESOURCE_STATUSES),
    rating: optional(z.coerce.number().int().min(1).max(5)),
    notesMd: z.string().max(20_000, "Keep notes under 20,000 characters").default(""),
  })
  .refine((r) => r.totalUnits === undefined || r.completedUnits <= r.totalUnits, {
    path: ["completedUnits"],
    message: "More than the total",
  });
export type ResourceFormInput = z.infer<typeof resourceFormSchema>;

/** Absolute count (the "Log progress" dialog) or a step (the "+1" button). */
export const progressSchema = z
  .object({
    id: z.uuid(),
    completed: optional(units.min(0, "Can't be negative")),
    step: optional(z.coerce.number().int().min(-1).max(1)),
  })
  .refine((p) => (p.completed === undefined) !== (p.step === undefined), {
    path: ["completed"],
    message: "Enter how far you are",
  });
export type ProgressInput = z.infer<typeof progressSchema>;

export const resourceIdSchema = z.object({ id: z.uuid() });

export const statusSchema = z.object({ id: z.uuid(), status: z.enum(RESOURCE_STATUSES) });
export type StatusInput = z.infer<typeof statusSchema>;

export const resourceFilterSchema = z.object({
  view: z.enum(["active", "done", "dropped", "all"]).catch("active"),
});
