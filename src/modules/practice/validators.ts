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

export const AUDIENCES = ["SELF", "RECORDED", "MOCK_PANEL", "LIVE"] as const;

export const presentationFormSchema = z.object({
  id: optional(id),
  title: text("Title", 200),
  trackId: optional(id),
  date: dateKey,
  durationMin: z.coerce.number().int().min(1, "At least 1 minute").max(600, "At most 10 hours"),
  audience: z.enum(AUDIENCES),
  selfScore: optional(rating),
  feedbackMd: markdown,
  recordingUrl: link,
});
export type PresentationFormInput = z.infer<typeof presentationFormSchema>;

export const questionFormSchema = z.object({
  id: optional(id),
  question: text("Question", 1000),
  trackId: optional(id),
  answerMd: markdown,
});
export type QuestionFormInput = z.infer<typeof questionFormSchema>;

export const reviewSchema = z.object({ id, outcome: z.enum(["remembered", "forgot"]) });

export const deleteSchema = z.object({ id, kind: z.enum(["presentation", "question"]) });
