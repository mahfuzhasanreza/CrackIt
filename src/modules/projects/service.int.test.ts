import { beforeEach, describe, expect, it } from "vitest";

import { createTestUser } from "../../../test/factories";

import { deleteProject, listProjects, saveProject } from "./service";
import { projectFormSchema } from "./validators";

let userId: string;
beforeEach(async () => {
  userId = (await createTestUser()).user.id;
});

describe("projects", () => {
  it("creates, edits and deletes, scoped to the owner", async () => {
    const input = projectFormSchema.parse({
      name: "CrackIt",
      status: "BUILDING",
      stack: "Next.js, PostgreSQL",
      repoUrl: "https://github.com/me/crackit",
    });
    expect((await saveProject(userId, input)).ok).toBe(true);
    const [p] = await listProjects(userId);
    expect(p).toMatchObject({ name: "CrackIt", stack: ["Next.js", "PostgreSQL"], liveUrl: null });

    expect((await saveProject(userId, { ...input, id: p!.id, status: "SHIPPED" })).ok).toBe(true);
    expect((await listProjects(userId))[0]!.status).toBe("SHIPPED");

    const other = (await createTestUser()).user.id;
    expect((await saveProject(other, { ...input, id: p!.id })).ok).toBe(false);
    expect((await deleteProject(other, p!.id)).ok).toBe(false);
    expect(await listProjects(other)).toEqual([]);

    expect((await deleteProject(userId, p!.id)).ok).toBe(true);
    expect(await listProjects(userId)).toEqual([]);
  });
});
