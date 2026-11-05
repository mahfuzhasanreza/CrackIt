"use client";

import {
  Ellipsis,
  ExternalLink,
  FolderGit2,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import { deleteProjectAction, saveProjectAction } from "../actions";
import type { ProjectView } from "../service";
import { PROJECT_STATUSES } from "../validators";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  BUILDING: "Building",
  SHIPPED: "Shipped",
  PAUSED: "Paused",
};

type DialogState = { kind: "add" } | { kind: "edit" | "delete"; project: ProjectView };

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

export function ProjectsGrid({ projects }: { projects: ProjectView[] }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Your portfolio: links, stack and what to say about each one in interviews.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "add" })}>
          <Plus />
          Add project
        </Button>
      </header>

      {projects.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No projects yet. Add the ones you want to talk about in interviews.
        </p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id} role="region" aria-labelledby={`project-${p.id}`}>
              <CardHeader>
                <CardTitle>
                  <h2 id={`project-${p.id}`}>{p.name}</h2>
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant={p.status === "SHIPPED" ? "default" : "outline"}>
                    {PROJECT_STATUS_LABEL[p.status]}
                  </Badge>
                </CardDescription>
                <CardAction>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Actions for ${p.name}`}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", project: p })}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDialog({ kind: "delete", project: p })}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {p.description && <p className="text-sm">{p.description}</p>}
                {p.stack.length > 0 && (
                  <ul aria-label="Stack" className="flex flex-wrap gap-1.5">
                    {p.stack.map((t) => (
                      <li key={t}>
                        <Badge variant="secondary" className="font-normal">
                          {t}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {(p.repoUrl || p.liveUrl) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {p.repoUrl && (
                      <a
                        href={p.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <FolderGit2 className="size-4" aria-hidden />
                        {hostOf(p.repoUrl)}
                      </a>
                    )}
                    {p.liveUrl && (
                      <a
                        href={p.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-4" aria-hidden />
                        {hostOf(p.liveUrl)}
                      </a>
                    )}
                  </div>
                )}
                {p.notesMd.trim() && (
                  <details className="rounded-md border px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Interview talking points
                    </summary>
                    <Markdown className="mt-2">{p.notesMd}</Markdown>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {dialog?.kind === "add" && <ProjectForm onDone={close} />}
          {dialog?.kind === "edit" && (
            <ProjectForm key={dialog.project.id} project={dialog.project} onDone={close} />
          )}
          {dialog?.kind === "delete" && <DeleteProject project={dialog.project} onDone={close} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectForm({ project, onDone }: { project?: ProjectView; onDone: () => void }) {
  const [state, action, pending] = useToastAction(saveProjectAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "BUILDING");
  const err = state.fieldErrors;
  const field = (
    id: string,
    name: string,
    label: string,
    input: React.ReactNode,
    optional = true,
  ) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label} {optional && <span className="text-muted-foreground">(optional)</span>}
      </Label>
      {input}
      {err?.[name]?.[0] && <p className="text-sm text-destructive">{err[name]![0]}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{project ? "Edit project" : "Add project"}</DialogTitle>
        <DialogDescription>Notes support Markdown.</DialogDescription>
      </DialogHeader>
      {project && <input type="hidden" name="id" value={project.id} />}
      <input type="hidden" name="status" value={status} />
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        {field(
          "project-name",
          "name",
          "Name",
          <Input
            id="project-name"
            name="name"
            required
            maxLength={120}
            defaultValue={project?.name ?? ""}
            aria-invalid={Boolean(err?.name)}
          />,
          false,
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="project-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
            <SelectTrigger id="project-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {field(
        "project-description",
        "description",
        "One-line description",
        <Input
          id="project-description"
          name="description"
          maxLength={500}
          defaultValue={project?.description ?? ""}
        />,
      )}
      {field(
        "project-stack",
        "stack",
        "Stack",
        <Input
          id="project-stack"
          name="stack"
          defaultValue={project?.stack.join(", ") ?? ""}
          placeholder="Next.js, PostgreSQL, Prisma"
          aria-invalid={Boolean(err?.stack)}
        />,
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "project-repo",
          "repoUrl",
          "Repository",
          <Input
            id="project-repo"
            name="repoUrl"
            type="url"
            defaultValue={project?.repoUrl ?? ""}
            placeholder="https://github.com/…"
            aria-invalid={Boolean(err?.repoUrl)}
          />,
        )}
        {field(
          "project-live",
          "liveUrl",
          "Live site",
          <Input
            id="project-live"
            name="liveUrl"
            type="url"
            defaultValue={project?.liveUrl ?? ""}
            placeholder="https://…"
            aria-invalid={Boolean(err?.liveUrl)}
          />,
        )}
      </div>
      {field(
        "project-notes",
        "notesMd",
        "Interview talking points",
        <Textarea
          id="project-notes"
          name="notesMd"
          rows={6}
          defaultValue={project?.notesMd ?? ""}
          placeholder={"- Problem it solves\n- Hardest bug\n- What I'd do differently"}
          className="font-mono text-[0.8125rem]"
        />,
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteProject({ project, onDone }: { project: ProjectView; onDone: () => void }) {
  const [, action, pending] = useToastAction(deleteProjectAction, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete “{project.name}”?</DialogTitle>
        <DialogDescription>This can&apos;t be undone.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={project.id} />
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Delete
        </Button>
      </DialogFooter>
    </form>
  );
}
