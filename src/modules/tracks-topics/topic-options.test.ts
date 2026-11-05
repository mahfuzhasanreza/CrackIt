import { describe, expect, it } from "vitest";

import { buildTopicOptions } from "./topic-options";

describe("buildTopicOptions", () => {
  it("flattens the tree depth-first with breadcrumb labels and sort order", () => {
    const options = buildTopicOptions([
      { id: "c2", parentId: "p", name: "Graphs", sortOrder: 1 },
      { id: "p", parentId: null, name: "DSA", sortOrder: 0 },
      { id: "c1", parentId: "p", name: "Arrays", sortOrder: 0 },
      { id: "g", parentId: "c2", name: "Dijkstra", sortOrder: 0 },
      { id: "q", parentId: null, name: "System Design", sortOrder: 1 },
    ]);
    expect(options).toEqual([
      { id: "p", label: "DSA", depth: 0 },
      { id: "c1", label: "DSA › Arrays", depth: 1 },
      { id: "c2", label: "DSA › Graphs", depth: 1 },
      { id: "g", label: "DSA › Graphs › Dijkstra", depth: 2 },
      { id: "q", label: "System Design", depth: 0 },
    ]);
  });
});
