import { z } from "zod";

/** FormData sends "" for empty fields; treat that as "not provided". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const id = z.uuid("Invalid id");
const note = optional(z.string().trim().max(1000, "Keep notes under 1000 characters"));
const focusRating = optional(z.coerce.number().int().min(1).max(5));

const refs = {
  activityTypeId: id,
  trackId: optional(id),
  topicId: optional(id),
};

export const startTimerSchema = z.object({ ...refs, note });
export type StartTimerInput = z.infer<typeof startTimerSchema>;

export const stopTimerSchema = z.object({ focusRating, note });
export type StopTimerInput = z.infer<typeof stopTimerSchema>;

/** Local wall-clock strings from <input type="datetime-local">; converted with the user's tz. */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time");

export const entryFormSchema = z.object({
  ...refs,
  startedAt: localDateTime,
  /** Empty only when editing the running entry. */
  endedAt: optional(localDateTime),
  focusRating,
  note,
});
export type EntryFormInput = z.infer<typeof entryFormSchema>;

/** Service-level input after time-zone conversion. */
export type EntryInput = Omit<EntryFormInput, "startedAt" | "endedAt"> & {
  startedAt: Date;
  endedAt: Date | null;
};
