import "server-only";

import type { TopicStatus } from "@/generated/prisma/enums";
import { err, ok, type Result } from "@/lib/result";

import * as repo from "./repository";
import { buildRoadmap, type RoadmapNode, summarizeRoadmap } from "./roadmap";
import type { CreateTopicInput, UpdateTopicInput } from "./validators";

/** Deepest allowed nesting (0 = root): Track › Area › Topic › Subtopic. */
export const MAX_TOPIC_DEPTH = 3;

export type RoadmapTrack = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  roots: RoadmapNode[];
  summary: ReturnType<typeof summarizeRoadmap>;
};

export async function getRoadmap(userId: string, now = new Date()): Promise<RoadmapTrack[]> {
  const [tracks, ms] = await Promise.all([
    repo.listRoadmapTracks(userId),
    repo.topicTimeTotals(userId, now),
  ]);
  return tracks.map(({ topics, ...track }) => {
    const roots = buildRoadmap(topics, ms);
    return { ...track, roots, summary: summarizeRoadmap(roots) };
  });
}

async function depthOf(userId: string, topicId: string): Promise<number> {
  let depth = 0;
  let current = await repo.findTopicDetail(userId, topicId);
  while (current?.parentId) {
    depth += 1;
    current = await repo.findTopicDetail(userId, current.parentId);
  }
  return depth;
}

const duplicate = () =>
  err("CONFLICT", "A topic with that name already exists here.", {
    name: ["Already exists at this level"],
  });

export async function createTopic(
  userId: string,
  input: CreateTopicInput,
): Promise<Result<{ id: string }>> {
  if (!(await repo.findOwnedTrack(userId, input.trackId))) {
    return err("VALIDATION", "Unknown track.", { trackId: ["Unknown track"] });
  }
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await repo.findTopicDetail(userId, parentId);
    if (!parent || parent.trackId !== input.trackId) {
      return err("VALIDATION", "Unknown parent topic.", { parentId: ["Unknown topic"] });
    }
    if ((await depthOf(userId, parentId)) >= MAX_TOPIC_DEPTH) {
      return err("VALIDATION", `Topics can be nested at most ${MAX_TOPIC_DEPTH + 1} levels deep.`);
    }
  }
  if (await repo.findSiblingByName(userId, input.trackId, parentId, input.name)) return duplicate();

  const siblings = await repo.listSiblings(userId, input.trackId, parentId);
  try {
    return ok(
      await repo.createTopic({
        userId,
        trackId: input.trackId,
        parentId,
        name: input.name,
        sortOrder: siblings.length,
      }),
    );
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate();
    throw error;
  }
}

export async function updateTopic(userId: string, input: UpdateTopicInput): Promise<Result<null>> {
  const topic = await repo.findTopicDetail(userId, input.id);
  if (!topic) return err("NOT_FOUND", "Topic not found.");
  if (await repo.findSiblingByName(userId, topic.trackId, topic.parentId, input.name, topic.id)) {
    return duplicate();
  }
  try {
    await repo.updateTopic(userId, input.id, {
      name: input.name,
      status: input.status,
      priority: input.priority,
    });
    return ok(null);
  } catch (error) {
    if (isUniqueViolation(error)) return duplicate();
    throw error;
  }
}

export async function setTopicStatus(
  userId: string,
  id: string,
  status: TopicStatus,
): Promise<Result<null>> {
  return (await repo.updateTopic(userId, id, { status }))
    ? ok(null)
    : err("NOT_FOUND", "Topic not found.");
}

/** Swap a topic with its previous/next sibling. Moving past either end is a no-op. */
export async function moveTopic(
  userId: string,
  id: string,
  direction: "up" | "down",
): Promise<Result<null>> {
  const topic = await repo.findTopicDetail(userId, id);
  if (!topic) return err("NOT_FOUND", "Topic not found.");
  const ids = (await repo.listSiblings(userId, topic.trackId, topic.parentId)).map((s) => s.id);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ids.length) return ok(null);
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await repo.reorderTopics(userId, ids);
  return ok(null);
}

export async function deleteTopic(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteTopic(userId, id)) ? ok(null) : err("NOT_FOUND", "Topic not found.");
}

/** Unique-constraint violation, however the driver adapter surfaces it. */
function isUniqueViolation(error: unknown): boolean {
  const text = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})) ?? "";
  return /P2002|23505|unique constraint/i.test(`${text} ${String(error)}`);
}
