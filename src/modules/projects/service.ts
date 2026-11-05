import "server-only";

import { err, ok, type Result } from "@/lib/result";

import * as repo from "./repository";
import type { ProjectFormInput } from "./validators";

export type { ProjectView } from "./repository";

export function listProjects(userId: string) {
  return repo.listProjects(userId);
}

/** Create (no `id`) or edit a project. */
export async function saveProject(userId: string, input: ProjectFormInput): Promise<Result<null>> {
  const data = {
    name: input.name,
    description: input.description ?? null,
    repoUrl: input.repoUrl ?? null,
    liveUrl: input.liveUrl ?? null,
    stack: input.stack,
    status: input.status,
    notesMd: input.notesMd,
  };
  if (!input.id) {
    await repo.createProject(userId, data);
    return ok(null);
  }
  return (await repo.updateProject(userId, input.id, data))
    ? ok(null)
    : err("NOT_FOUND", "Project not found.");
}

export async function deleteProject(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteProject(userId, id)) ? ok(null) : err("NOT_FOUND", "Project not found.");
}
