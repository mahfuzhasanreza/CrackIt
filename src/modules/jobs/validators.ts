import { z } from "zod";

import { isValidDateKey } from "@/lib/dates";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const id = z.uuid("Invalid id");
const link = optional(
  z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).max(2000),
);
const dateKey = z.string().refine(isValidDateKey, "Pick a valid date");
const markdown = z.string().max(20_000, "Keep it under 20,000 characters").default("");
const shortText = (max: number) =>
  optional(z.string().trim().max(max, `Keep it under ${max} characters`));
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time");

export const STATUSES = [
  "WISHLIST",
  "APPLIED",
  "OA",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;
export const ORG_TYPES = ["COMPANY", "UNIVERSITY"] as const;
export const ROUNDS = [
  "SCREENING",
  "OA",
  "TECHNICAL",
  "SYSTEM_DESIGN",
  "BEHAVIORAL",
  "HR",
  "TEACHING_DEMO",
  "VIVA",
  "WRITTEN",
] as const;
export const OUTCOMES = ["PENDING", "PASSED", "FAILED", "CANCELLED"] as const;

/** Organization is given by name: an existing one (case-insensitive) or a new one. */
export const applicationFormSchema = z.object({
  id: optional(id),
  organizationName: z.string().trim().min(1, "Which organization?").max(120),
  organizationType: z.enum(ORG_TYPES).default("COMPANY"),
  role: z.string().trim().min(1, "What's the role?").max(200),
  trackId: optional(id),
  status: z.enum(STATUSES),
  jobUrl: link,
  source: shortText(100),
  appliedOn: optional(dateKey),
  deadlineOn: optional(dateKey),
  salaryRange: shortText(100),
  notesMd: markdown,
});
export type ApplicationFormInput = z.infer<typeof applicationFormSchema>;

export const moveSchema = z.object({ id, status: z.enum(STATUSES) });

export const organizationFormSchema = z.object({
  id,
  name: z.string().trim().min(1, "Give it a name").max(120),
  type: z.enum(ORG_TYPES),
  website: link,
  location: shortText(120),
  notesMd: markdown,
});
export type OrganizationFormInput = z.infer<typeof organizationFormSchema>;

export const interviewFormSchema = z
  .object({
    id: optional(id),
    /** An existing application, or (new interviews only) one created from the two fields below. */
    applicationId: optional(id),
    newOrganizationName: shortText(120),
    newRole: shortText(200),
    round: z.enum(ROUNDS),
    scheduledAt: localDateTime,
    durationMin: optional(z.coerce.number().int().min(1).max(1440)),
    interviewer: shortText(200),
    outcome: z.enum(OUTCOMES).default("PENDING"),
    selfRating: optional(z.coerce.number().int().min(1).max(5)),
    questionsMd: markdown,
    myAnswersMd: markdown,
    lessonsMd: markdown,
  })
  .superRefine((v, ctx) => {
    if (v.applicationId || v.id) return;
    if (!v.newOrganizationName) {
      ctx.addIssue({
        code: "custom",
        path: ["newOrganizationName"],
        message: "Which organization?",
      });
    }
    if (!v.newRole)
      ctx.addIssue({ code: "custom", path: ["newRole"], message: "What's the role?" });
  });
export type InterviewFormInput = z.infer<typeof interviewFormSchema>;

export const mockFormSchema = z.object({
  id: optional(id),
  date: dateKey,
  partner: shortText(120),
  type: z.enum(ROUNDS),
  trackId: optional(id),
  score: optional(z.coerce.number().int().min(1).max(5)),
  feedbackMd: markdown,
});
export type MockFormInput = z.infer<typeof mockFormSchema>;

/** Quick "how did it go?" from a list or the detail page. */
export const outcomeSchema = z.object({
  id,
  outcome: z.enum(OUTCOMES),
  selfRating: optional(z.coerce.number().int().min(1).max(5)),
});
export type OutcomeInput = z.infer<typeof outcomeSchema>;

export const deleteSchema = z.object({
  id,
  kind: z.enum(["application", "organization", "interview", "mock"]),
});
