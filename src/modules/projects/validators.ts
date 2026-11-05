import { z } from "zod";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const link = optional(
  z.url({ protocol: /^https?$/, message: "Use a full http(s):// link" }).max(2000),
);

export const PROJECT_STATUSES = ["PLANNING", "BUILDING", "SHIPPED", "PAUSED"] as const;

/** "Next.js, PostgreSQL ,  next.js" → ["Next.js", "PostgreSQL"] (case kept, deduped). */
export function parseStack(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const tech = part.trim().replace(/\s+/g, " ");
    if (!tech || seen.has(tech.toLowerCase())) continue;
    seen.add(tech.toLowerCase());
    out.push(tech);
  }
  return out;
}

export const projectFormSchema = z.object({
  id: optional(z.uuid()),
  name: z.string().trim().min(1, "Give it a name").max(120, "Keep it under 120 characters"),
  description: optional(z.string().trim().max(500, "Keep it under 500 characters")),
  repoUrl: link,
  liveUrl: link,
  stack: z
    .string()
    .default("")
    .transform(parseStack)
    .refine((s) => s.length <= 20, "At most 20 technologies")
    .refine((s) => s.every((t) => t.length <= 40), "Keep each technology under 40 characters"),
  status: z.enum(PROJECT_STATUSES),
  notesMd: z.string().max(20_000, "Keep notes under 20,000 characters").default(""),
});
export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const projectIdSchema = z.object({ id: z.uuid() });
