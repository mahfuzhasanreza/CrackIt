"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Ellipsis,
  LoaderCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator,
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
import type { TopicStatus } from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";
import { ProgressMeter } from "@/components/progress-meter";
import { formatDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import {
  createTopicAction,
  deleteTopicAction,
  moveTopicAction,
  setTopicStatusAction,
  updateTopicAction,
} from "../actions";
import { type RoadmapNode, STATUS_LABEL, TOPIC_STATUSES } from "../roadmap";

type DialogTarget =
  | { kind: "add"; trackId: string; parent: RoadmapNode | null }
  | { kind: "edit"; node: RoadmapNode }
  | { kind: "delete"; node: RoadmapNode };

const formData = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

/** One track's topic tree: expand/collapse, inline status, add/edit/move/delete. */
export function RoadmapTree({
  trackId,
  trackName,
  roots,
}: {
  trackId: string;
  trackName: string;
  roots: RoadmapNode[];
}) {
  // Top-level areas start expanded.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(roots.map((r) => r.id)));
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(new Set(allParentIds(roots)))}
          >
            Expand all
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(new Set())}>
            Collapse all
          </Button>
        </div>
        <Button size="sm" onClick={() => setDialog({ kind: "add", trackId, parent: null })}>
          <Plus />
          Add topic
        </Button>
      </div>

      {roots.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No topics in {trackName} yet.
        </p>
      ) : (
        <ul aria-label={`${trackName} topics`} className="flex flex-col">
          {roots.map((node, i) => (
            <TopicItem
              key={node.id}
              node={node}
              trackId={trackId}
              isFirst={i === 0}
              isLast={i === roots.length - 1}
              expanded={expanded}
              onToggle={toggle}
              onDialog={setDialog}
            />
          ))}
        </ul>
      )}

      <TopicDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

function allParentIds(nodes: RoadmapNode[]): string[] {
  return nodes.flatMap((n) => (n.children.length ? [n.id, ...allParentIds(n.children)] : []));
}

function TopicItem({
  node,
  trackId,
  isFirst,
  isLast,
  expanded,
  onToggle,
  onDialog,
}: {
  node: RoadmapNode;
  trackId: string;
  isFirst: boolean;
  isLast: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDialog: (d: DialogTarget) => void;
}) {
  const isParent = node.children.length > 0;
  const open = expanded.has(node.id);
  const [, move, moving] = useToastAction(moveTopicAction);
  const [, startTransition] = useTransition();
  const doMove = (direction: "up" | "down") =>
    startTransition(() => move(formData({ id: node.id, direction })));

  return (
    <li className="flex flex-col">
      <div
        className={cn(
          "group flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-md py-1 pr-1 hover:bg-accent/50",
          moving && "opacity-60",
        )}
        style={{ paddingLeft: `${node.depth * 1.25 + 0.25}rem` }}
      >
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-1.5">
          {isParent ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
              aria-expanded={open}
              onClick={() => onToggle(node.id)}
            >
              <ChevronRight className={cn("transition-transform", open && "rotate-90")} />
            </Button>
          ) : (
            <span className="size-7 shrink-0" aria-hidden />
          )}
          <span className={cn("truncate text-sm", isParent && "font-medium")}>{node.name}</span>
          {node.priority > 0 && (
            <Star
              className="size-3.5 shrink-0 fill-current text-muted-foreground"
              aria-label="Focus topic"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          {isParent ? (
            <div className="flex w-44 items-center gap-2">
              <ProgressMeter value={node.progress} label={`${node.name} progress`} />
              <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                {node.counts.CONFIDENT}/{node.leafCount}
              </span>
            </div>
          ) : (
            <StatusSelect id={node.id} name={node.name} status={node.status} />
          )}
          <span
            className="w-16 text-right text-xs text-muted-foreground tabular-nums"
            title="Time logged (including subtopics)"
          >
            {node.totalMs > 0 ? formatDuration(node.totalMs) : "–"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions for ${node.name}`}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {node.depth < 3 && (
                <DropdownMenuItem onSelect={() => onDialog({ kind: "add", trackId, parent: node })}>
                  <Plus />
                  Add subtopic
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => onDialog({ kind: "edit", node })}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isFirst} onSelect={() => doMove("up")}>
                <ArrowUp />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isLast} onSelect={() => doMove("down")}>
                <ArrowDown />
                Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDialog({ kind: "delete", node })}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isParent && open && (
        <ul className="flex flex-col">
          {node.children.map((child, i) => (
            <TopicItem
              key={child.id}
              node={child}
              trackId={trackId}
              isFirst={i === 0}
              isLast={i === node.children.length - 1}
              expanded={expanded}
              onToggle={onToggle}
              onDialog={onDialog}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function StatusSelect({ id, name, status }: { id: string; name: string; status: TopicStatus }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [, dispatch] = useToastAction(setTopicStatusAction);
  const [, startTransition] = useTransition();
  return (
    <Select
      value={optimistic}
      onValueChange={(v) =>
        startTransition(() => {
          setOptimistic(v as TopicStatus);
          dispatch(formData({ id, status: v }));
        })
      }
    >
      <SelectTrigger size="sm" className="w-44" aria-label={`Status of ${name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TOPIC_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <StatusDot status={s} />
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Neutral fill levels (no hue): empty → quarter → half → full circle. */
export function StatusDot({ status }: { status: TopicStatus }) {
  const fill = { NOT_STARTED: 0, LEARNING: 1, REVISING: 2, CONFIDENT: 3 }[status];
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0 text-foreground" aria-hidden>
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {fill === 3 ? (
        <circle cx="6" cy="6" r="5" fill="currentColor" />
      ) : fill > 0 ? (
        <path
          d={fill === 1 ? "M6 6 L6 1 A5 5 0 0 1 11 6 Z" : "M6 6 L6 1 A5 5 0 0 1 6 11 Z"}
          fill="currentColor"
        />
      ) : null}
    </svg>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

function TopicDialog({ target, onClose }: { target: DialogTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target?.kind === "add" && <AddForm target={target} onDone={onClose} />}
        {target?.kind === "edit" && (
          <EditForm key={target.node.id} node={target.node} onDone={onClose} />
        )}
        {target?.kind === "delete" && <DeleteForm node={target.node} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AddForm({
  target,
  onDone,
}: {
  target: Extract<DialogTarget, { kind: "add" }>;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(createTopicAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{target.parent ? "Add subtopic" : "Add topic"}</DialogTitle>
        <DialogDescription>
          {target.parent ? `Under ${target.parent.name}.` : "A new top-level area for this track."}
        </DialogDescription>
      </DialogHeader>
      <input type="hidden" name="trackId" value={target.trackId} />
      <input type="hidden" name="parentId" value={target.parent?.id ?? ""} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="topic-name">Name</Label>
        <Input
          id="topic-name"
          name="name"
          required
          maxLength={120}
          autoFocus
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Add
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ node, onDone }: { node: RoadmapNode; onDone: () => void }) {
  const [state, action, pending] = useToastAction(updateTopicAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [status, setStatus] = useState<TopicStatus>(node.status);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit topic</DialogTitle>
        <DialogDescription>
          {node.children.length
            ? "Progress for this topic comes from its subtopics."
            : "Status drives the roadmap progress."}
        </DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={node.id} />
      <input type="hidden" name="status" value={status} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="topic-edit-name">Name</Label>
        <Input
          id="topic-edit-name"
          name="name"
          required
          maxLength={120}
          defaultValue={node.name}
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      {node.children.length === 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="topic-edit-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TopicStatus)}>
            <SelectTrigger id="topic-edit-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPIC_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <StatusDot status={s} />
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="priority"
          defaultChecked={node.priority > 0}
          className="size-4 accent-primary"
        />
        Focus topic (starred)
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteForm({ node, onDone }: { node: RoadmapNode; onDone: () => void }) {
  const [, action, pending] = useToastAction(deleteTopicAction, onDone);
  const descendants = countDescendants(node);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete “{node.name}”?</DialogTitle>
        <DialogDescription>
          {descendants > 0
            ? `This also deletes its ${descendants} subtopic${descendants === 1 ? "" : "s"}. `
            : ""}
          Logged time and learning notes are kept, just no longer linked to this topic.
        </DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={node.id} />
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

function countDescendants(node: RoadmapNode): number {
  return node.children.reduce((n, c) => n + 1 + countDescendants(c), 0);
}
