import { z } from "zod";

import { TOPIC_STATUSES } from "./roadmap";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const name = z.string().trim().min(1, "Give it a name").max(120, "Keep it under 120 characters");

export const createTopicSchema = z.object({
  trackId: z.uuid(),
  parentId: optional(z.uuid()),
  name,
});
export type CreateTopicInput = z.infer<typeof createTopicSchema>;

export const updateTopicSchema = z.object({
  id: z.uuid(),
  name,
  status: z.enum(TOPIC_STATUSES),
  /** Checkbox: "on" = focus topic. */
  priority: z.preprocess((v) => (v === "on" || v === "1" ? 1 : 0), z.number().int()),
});
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;

export const topicStatusSchema = z.object({ id: z.uuid(), status: z.enum(TOPIC_STATUSES) });

export const moveTopicSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });

export const topicIdSchema = z.object({ id: z.uuid() });
