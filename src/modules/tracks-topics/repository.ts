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

// ── Roadmap (topics page) ───────────────────────────────────────────────────

const roadmapTopicSelect = {
  id: true,
  parentId: true,
  name: true,
  status: true,
  priority: true,
  sortOrder: true,
} as const;

/** Active tracks with every topic (flat). */
export function listRoadmapTracks(userId: string) {
  return db.track.findMany({
    where: { userId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      description: true,
      topics: { select: roadmapTopicSelect },
    },
  });
}

/** Milliseconds logged per topic (a running entry counts up to `now`). */
export async function topicTimeTotals(userId: string, now: Date): Promise<Record<string, number>> {
  const rows = await db.$queryRaw<{ topic_id: string; ms: number }[]>`
    SELECT topic_id::text AS topic_id,
           (EXTRACT(EPOCH FROM SUM(COALESCE(ended_at, ${now}::timestamptz) - started_at)) * 1000)::float8 AS ms
    FROM time_entries
    WHERE user_id = ${userId}::uuid AND topic_id IS NOT NULL
    GROUP BY topic_id`;
  return Object.fromEntries(rows.map((r) => [r.topic_id, Math.max(0, r.ms)]));
}

export function findTopicDetail(userId: string, id: string) {
  return db.topic.findFirst({
    where: { id, userId },
    select: { ...roadmapTopicSelect, trackId: true },
  });
}

export function findSiblingByName(
  userId: string,
  trackId: string,
  parentId: string | null,
  name: string,
  excludeId?: string,
) {
  return db.topic.findFirst({
    where: {
      userId,
      trackId,
      parentId,
      name: { equals: name, mode: "insensitive" },
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });
}

export function listSiblings(userId: string, trackId: string, parentId: string | null) {
  return db.topic.findMany({
    where: { userId, trackId, parentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
}

export function createTopic(data: {
  userId: string;
  trackId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
}) {
  return db.topic.create({ data, select: { id: true } });
}

export async function updateTopic(
  userId: string,
  id: string,
  data: {
    name?: string;
    status?: import("@/generated/prisma/enums").TopicStatus;
    priority?: number;
  },
) {
  const { count } = await db.topic.updateMany({ where: { id, userId }, data });
  return count > 0;
}

/** Rewrite sibling order as 0..n-1 in the given id order. */
export function reorderTopics(userId: string, orderedIds: string[]) {
  return db.$transaction(
    orderedIds.map((id, i) =>
      db.topic.updateMany({ where: { id, userId }, data: { sortOrder: i } }),
    ),
  );
}

/** Deletes the topic and (FK cascade) its subtopics; time/learning entries are unlinked. */
export async function deleteTopic(userId: string, id: string) {
  const { count } = await db.topic.deleteMany({ where: { id, userId } });
  return count > 0;
}
