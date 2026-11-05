import "server-only";

import { db } from "@/lib/db";

import { buildTopicOptions, type TopicOption } from "./topic-options";

export type TrackOption = { id: string; name: string; color: string; topics: TopicOption[] };

/** Active tracks with their topic tree flattened for pickers. */
export async function listTrackOptions(userId: string): Promise<TrackOption[]> {
  const tracks = await db.track.findMany({
    where: { userId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      topics: { select: { id: true, parentId: true, name: true, sortOrder: true } },
    },
  });
  return tracks.map(({ topics, ...t }) => ({ ...t, topics: buildTopicOptions(topics) }));
}
