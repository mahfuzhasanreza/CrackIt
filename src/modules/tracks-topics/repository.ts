import "server-only";

import { db } from "@/lib/db";

import { buildTopicOptions, type TopicOption } from "./topic-options";

export type TrackOption = {
  id: string;
  name: string;
  color: string;
  weeklyTargetMinutes: number | null;
  topics: TopicOption[];
};

/** Active tracks with their topic tree flattened for pickers. */
export async function listTrackOptions(userId: string): Promise<TrackOption[]> {
  const tracks = await db.track.findMany({
    where: { userId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      weeklyTargetMinutes: true,
      topics: { select: { id: true, parentId: true, name: true, sortOrder: true } },
    },
  });
  return tracks.map(({ topics, ...t }) => ({ ...t, topics: buildTopicOptions(topics) }));
}

/** Ownership checks for references from other modules. */
export function findOwnedTrack(userId: string, id: string) {
  return db.track.findFirst({ where: { id, userId }, select: { id: true } });
}

export function findOwnedTopic(userId: string, id: string) {
  return db.topic.findFirst({ where: { id, userId }, select: { id: true, trackId: true } });
}
