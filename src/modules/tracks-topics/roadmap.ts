import type { TopicStatus } from "@/generated/prisma/enums";

/**
 * Roadmap progress. Only leaf topics carry progress (a parent is "done" when its children are):
 * each leaf scores by status, a parent averages the leaves under it. Time rolls up from
 * children to parents.
 */
export const STATUS_WEIGHT: Record<TopicStatus, number> = {
  NOT_STARTED: 0,
  LEARNING: 1 / 3,
  REVISING: 2 / 3,
  CONFIDENT: 1,
};

export const TOPIC_STATUSES = ["NOT_STARTED", "LEARNING", "REVISING", "CONFIDENT"] as const;

export const STATUS_LABEL: Record<TopicStatus, string> = {
  NOT_STARTED: "Not started",
  LEARNING: "Learning",
  REVISING: "Revising",
  CONFIDENT: "Confident",
};

export type RoadmapTopic = {
  id: string;
  parentId: string | null;
  name: string;
  status: TopicStatus;
  priority: number;
  sortOrder: number;
};

export type RoadmapNode = RoadmapTopic & {
  depth: number;
  children: RoadmapNode[];
  /** Time logged directly on this topic. */
  ownMs: number;
  /** Own time plus all descendants'. */
  totalMs: number;
  /** Leaf topics at or under this node (a leaf counts itself). */
  leafCount: number;
  /** 0–1, average status weight of those leaves. */
  progress: number;
  /** Status counts over those leaves. */
  counts: Record<TopicStatus, number>;
};

const emptyCounts = (): Record<TopicStatus, number> => ({
  NOT_STARTED: 0,
  LEARNING: 0,
  REVISING: 0,
  CONFIDENT: 0,
});

export function buildRoadmap(
  topics: RoadmapTopic[],
  msByTopic: Record<string, number> = {},
): RoadmapNode[] {
  const byParent = new Map<string | null, RoadmapTopic[]>();
  for (const t of topics) {
    const list = byParent.get(t.parentId) ?? [];
    list.push(t);
    byParent.set(t.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  const build = (parentId: string | null, depth: number): RoadmapNode[] =>
    (byParent.get(parentId) ?? []).map((t) => {
      const children = build(t.id, depth + 1);
      const ownMs = msByTopic[t.id] ?? 0;
      const counts = emptyCounts();
      let leafCount = 0;
      let weight = 0;
      if (children.length === 0) {
        counts[t.status] += 1;
        leafCount = 1;
        weight = STATUS_WEIGHT[t.status];
      } else {
        for (const c of children) {
          leafCount += c.leafCount;
          weight += c.progress * c.leafCount;
          for (const s of TOPIC_STATUSES) counts[s] += c.counts[s];
        }
      }
      return {
        ...t,
        depth,
        children,
        ownMs,
        totalMs: ownMs + children.reduce((sum, c) => sum + c.totalMs, 0),
        leafCount,
        progress: leafCount ? weight / leafCount : 0,
        counts,
      };
    });

  return build(null, 0);
}

/** Totals for a whole track (its root nodes). */
export function summarizeRoadmap(roots: RoadmapNode[]) {
  const counts = emptyCounts();
  let leafCount = 0;
  let weight = 0;
  let totalMs = 0;
  for (const r of roots) {
    leafCount += r.leafCount;
    weight += r.progress * r.leafCount;
    totalMs += r.totalMs;
    for (const s of TOPIC_STATUSES) counts[s] += r.counts[s];
  }
  return { leafCount, progress: leafCount ? weight / leafCount : 0, totalMs, counts };
}

/** Ids of a node and everything under it. */
export function subtreeIds(node: RoadmapNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}
