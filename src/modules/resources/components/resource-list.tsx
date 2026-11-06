"use client";

import {
  Ban,
  Check,
  Ellipsis,
  ExternalLink,
  LoaderCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { startTransition, useState } from "react";

import { Markdown } from "@/components/markdown";
import { ProgressMeter } from "@/components/progress-meter";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToastAction } from "@/hooks/use-toast-action";
import { formatDateKey } from "@/lib/dates";

import { logProgressAction, setResourceStatusAction } from "../actions";
import { STATUS_LABEL, TYPE_ICON, TYPE_LABEL } from "../labels";
import type { ResourceView } from "../service";

import { DeleteResource, ProgressForm, ResourceForm, type TrackChoice } from "./resource-form";

type DialogState = { kind: "edit" | "progress" | "delete"; resource: ResourceView };

/** "Add resource" for the page header. */
export function AddResourceButton({ tracks }: { tracks: TrackChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Add resource
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {open && <ResourceForm tracks={tracks} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The resource cards plus the dialogs they open. */
export function ResourceList({
  resources,
  tracks,
  emptyText,
}: {
  resources: ResourceView[];
  tracks: TrackChoice[];
  emptyText: string;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      {resources.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((r) => (
            <li key={r.id}>
              <ResourceCard resource={r} open={(kind) => setDialog({ kind, resource: r })} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {dialog?.kind === "edit" && (
            <ResourceForm
              key={dialog.resource.id}
              resource={dialog.resource}
              tracks={tracks}
              onDone={close}
            />
          )}
          {dialog?.kind === "progress" && (
            <ProgressForm resource={dialog.resource} onDone={close} />
          )}
          {dialog?.kind === "delete" && (
            <DeleteResource resource={dialog.resource} onDone={close} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function progressText(r: ResourceView) {
  if (r.totalUnits) return `${r.completedUnits} / ${r.totalUnits} ${r.unit}`;
  return `${r.completedUnits} ${r.unit}`;
}

function ResourceCard({
  resource: r,
  open,
}: {
  resource: ResourceView;
  open: (kind: "edit" | "progress" | "delete") => void;
}) {
  const Icon = TYPE_ICON[r.type];
  const headingId = `resource-${r.id}`;
  const canStep = r.status !== "DONE" && (r.totalUnits === null || r.completedUnits < r.totalUnits);
  // Lives on the card (not the menu item) so it survives the menu closing.
  const [, statusAction] = useToastAction(setResourceStatusAction);
  const setStatus = (status: "DONE" | "DROPPED") => {
    const fd = new FormData();
    fd.set("id", r.id);
    fd.set("status", status);
    startTransition(() => statusAction(fd));
  };

  return (
    <Card role="region" aria-labelledby={headingId} className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-start gap-2 leading-snug">
          <Icon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-label={TYPE_LABEL[r.type]}
          />
          <h2 id={headingId} className="min-w-0 break-words">
            {r.title}
          </h2>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant={r.status === "IN_PROGRESS" ? "default" : "outline"}>
            {STATUS_LABEL[r.status]}
          </Badge>
          {r.author && <span>{r.author}</span>}
          {r.track && (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: r.track.color }}
              />
              {r.track.name}
            </span>
          )}
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions for ${r.title}`}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => open("progress")}>
                <TrendingUp />
                Log progress
              </DropdownMenuItem>
              {r.status !== "DONE" && (
                <DropdownMenuItem onSelect={() => setStatus("DONE")}>
                  <Check />
                  Mark as done
                </DropdownMenuItem>
              )}
              {r.status !== "DONE" && r.status !== "DROPPED" && (
                <DropdownMenuItem onSelect={() => setStatus("DROPPED")}>
                  <Ban />
                  Drop
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => open("edit")}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => open("delete")}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="tabular-nums">{progressText(r)}</span>
              {r.progress !== null && (
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(r.progress * 100)}%
                </span>
              )}
            </div>
            {r.progress !== null && (
              <ProgressMeter
                value={r.progress}
                label={`${r.title} progress`}
                valueText={progressText(r)}
              />
            )}
          </div>
          {canStep && <StepButton resource={r} />}
        </div>

        <Footer resource={r} />

        {r.notesMd.trim() && (
          <details className="rounded-md border px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Notes</summary>
            <Markdown className="mt-2">{r.notesMd}</Markdown>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function Footer({ resource: r }: { resource: ResourceView }) {
  const dates =
    r.status === "DONE" && r.finishedOn
      ? `Finished ${formatDateKey(r.finishedOn)}`
      : r.startedOn && r.status !== "PLANNED"
        ? `Started ${formatDateKey(r.startedOn)}`
        : null;
  if (!dates && !r.url && !r.rating) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {dates && <span>{dates}</span>}
      {r.rating && (
        <span className="flex items-center gap-1" aria-label={`Rated ${r.rating} of 5`}>
          <Star className="size-3.5" aria-hidden />
          <span aria-hidden>{r.rating}/5</span>
        </span>
      )}
      {r.url && (
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 hover:text-foreground"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open
          <span className="sr-only">{r.title}</span>
        </a>
      )}
    </div>
  );
}

/** "+1 chapter": quiet unless it finishes the resource. */
function StepButton({ resource: r }: { resource: ResourceView }) {
  const [, action, pending] = useToastAction(logProgressAction);
  const one = r.unit.replace(/s$/, "");
  return (
    <form action={action}>
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="step" value="1" />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-label={`Add one ${one} to ${r.title}`}
        className="tabular-nums"
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}1
      </Button>
    </form>
  );
}
