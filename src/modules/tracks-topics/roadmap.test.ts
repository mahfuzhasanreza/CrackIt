import { describe, expect, it } from "vitest";

import { buildRoadmap, type RoadmapTopic, subtreeIds, summarizeRoadmap } from "./roadmap";

const t = (
  id: string,
  parentId: string | null,
  status: RoadmapTopic["status"] = "NOT_STARTED",
  sortOrder = 0,
): RoadmapTopic => ({ id, parentId, name: id, status, priority: 0, sortOrder });

describe("buildRoadmap", () => {
  const topics = [
    t("dsa", null, "CONFIDENT", 0), // parent: its own status is ignored
    t("arrays", "dsa", "CONFIDENT", 0),
    t("graphs", "dsa", "NOT_STARTED", 1),
    t("dijkstra", "graphs", "LEARNING", 0),
    t("bfs", "graphs", "REVISING", 1),
    t("sd", null, "NOT_STARTED", 1),
  ];

  it("nests children in sort order with depth", () => {
    const [dsa, sd] = buildRoadmap(topics);
    expect(dsa!.children.map((c) => c.id)).toEqual(["arrays", "graphs"]);
    expect(dsa!.children[1]!.children.map((c) => [c.id, c.depth])).toEqual([
      ["dijkstra", 2],
      ["bfs", 2],
    ]);
    expect(sd!.children).toEqual([]);
  });

  it("scores progress from leaves only", () => {
    const [dsa, sd] = buildRoadmap(topics);
    const graphs = dsa!.children[1]!;
    expect(graphs.leafCount).toBe(2);
    expect(graphs.progress).toBeCloseTo((1 / 3 + 2 / 3) / 2);
    // arrays (1) + dijkstra (1/3) + bfs (2/3) over 3 leaves
    expect(dsa!.progress).toBeCloseTo(2 / 3);
    expect(dsa!.counts).toEqual({ NOT_STARTED: 0, LEARNING: 1, REVISING: 1, CONFIDENT: 1 });
    expect(sd!.progress).toBe(0);
  });

  it("rolls time up to parents", () => {
    const [dsa] = buildRoadmap(topics, { dijkstra: 60_000, graphs: 30_000, arrays: 10_000 });
    expect(dsa!.children[1]!.ownMs).toBe(30_000);
    expect(dsa!.children[1]!.totalMs).toBe(90_000);
    expect(dsa!.totalMs).toBe(100_000);
  });

  it("summarises a track and lists subtree ids", () => {
    const roots = buildRoadmap(topics, { bfs: 5_000 });
    const s = summarizeRoadmap(roots);
    expect(s.leafCount).toBe(4);
    expect(s.progress).toBeCloseTo(2 / 4);
    expect(s.totalMs).toBe(5_000);
    expect(subtreeIds(roots[0]!.children[1]!)).toEqual(["graphs", "dijkstra", "bfs"]);
  });
});
