import "server-only";

import { listTrackOptions, type TrackOption } from "../tracks-topics/repository";

import { type ActivityOption, listActivityOptions } from "./repository";

export type { ActivityOption, TrackOption };
export type EntryOptions = { activities: ActivityOption[]; tracks: TrackOption[] };

/** Everything the timer/entry forms need for their pickers. */
export async function getEntryOptions(userId: string): Promise<EntryOptions> {
  const [activities, tracks] = await Promise.all([
    listActivityOptions(userId),
    listTrackOptions(userId),
  ]);
  return { activities, tracks };
}
