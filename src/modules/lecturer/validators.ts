import { z } from "zod";

import { isValidDateKey } from "@/lib/dates";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const id = z.uuid("Invalid id");
const link = optional(
  z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).max(2000),
);
const dateKey = z.string().refine(isValidDateKey, "Pick a valid date");
const rating = z.coerce.number().int().min(1).max(5);
const markdown = z.string().max(20_000, "Keep it under 20,000 characters").default("");
const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Keep it under ${max} characters`);

export const AUDIENCES = ["SELF", "RECORDED", "MOCK_PANEL", "LIVE_CLASS"] as const;
export const PUBLICATION_STATUSES = [
  "IDEA",
  "WRITING",
  "SUBMITTED",
  "ACCEPTED",
  "PUBLISHED",
  "REJECTED",
] as const;

export const courseFormSchema = z.object({
  id: optional(id),
  name: text("Name", 120),
  code: optional(z.string().trim().max(20)),
  syllabusUrl: link,
  readiness: rating,
  notesMd: markdown,
});
export type CourseFormInput = z.infer<typeof courseFormSchema>;

export const demoFormSchema = z.object({
  id: optional(id),
  topic: text("Topic", 200),
  courseId: optional(id),
  date: dateKey,
  durationMin: z.coerce.number().int().min(1, "At least 1 minute").max(600, "At most 10 hours"),
  audience: z.enum(AUDIENCES),
  selfScore: optional(rating),
  feedbackMd: markdown,
  recordingUrl: link,
});
export type DemoFormInput = z.infer<typeof demoFormSchema>;

export const publicationFormSchema = z.object({
  id: optional(id),
  title: text("Title", 300),
  venue: optional(z.string().trim().max(200)),
  status: z.enum(PUBLICATION_STATUSES),
  submittedOn: optional(dateKey),
  url: link,
  notesMd: markdown,
});
export type PublicationFormInput = z.infer<typeof publicationFormSchema>;

export const vivaFormSchema = z.object({
  id: optional(id),
  question: text("Question", 1000),
  courseId: optional(id),
  answerMd: markdown,
});
export type VivaFormInput = z.infer<typeof vivaFormSchema>;

export const practiceSchema = z.object({ id, outcome: z.enum(["remembered", "forgot"]) });

export const deleteSchema = z.object({
  id,
  kind: z.enum(["course", "demo", "publication", "viva"]),
});
