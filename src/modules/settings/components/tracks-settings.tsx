"use client";

import { ArrowDown, ArrowUp, Ellipsis, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { startTransition, useState } from "react";

import { FormField } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityCategory } from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";
import { formatDuration } from "@/lib/dates";
import { SERIES, seriesVars } from "@/lib/palette";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import {
  deleteActivityTypeAction,
  deleteTrackAction,
  moveActivityTypeAction,
  moveTrackAction,
  saveActivityTypeAction,
  saveTrackAction,
} from "../actions";
import type { ActivityTypeRow, TrackRow } from "../service";
import { ACTIVITY_CATEGORIES } from "../validators";

import { ColorChoice } from "./color-choice";
import { TopicsField } from "./topics-field";

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  STUDY: "Study",
  SLEEP: "Sleep",
  BREAK: "Break / gap",
  WORK: "Work",
  EXERCISE: "Exercise",
  PERSONAL: "Personal",
  OTHER: "Other",
};

type Kind = "track" | "activity";
type Dialogs =
  | { kind: "add-track" }
  | { kind: "add-activity" }
  | { kind: "edit-track" | "delete-track"; track: TrackRow }
  | { kind: "edit-activity" | "delete-activity"; activity: ActivityTypeRow };

/** Up/down + edit/delete for one row; moving is quiet (no toast). */
function RowMenu({
  kind,
  id,
  name,
  first,
  last,
  onEdit,
  onDelete,
}: {
  kind: Kind;
  id: string;
  name: string;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [, move] = useToastAction(kind === "track" ? moveTrackAction : moveActivityTypeAction);
  const go = (direction: "up" | "down") => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("direction", direction);
    startTransition(() => move(fd));
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${name}`}>
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={first} onSelect={() => go("up")}>
          <ArrowUp />
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem disabled={last} onSelect={() => go("down")}>
          <ArrowDown />
          Move down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-full bg-series"
      style={seriesVars(color)}
    />
  );
}

export function TracksSettings({ tracks }: { tracks: TrackRow[] }) {
  const [dialog, setDialog] = useState<Dialogs | null>(null);
  const close = () => setDialog(null);
  return (
    <section aria-labelledby="tracks-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tracks-heading" className="text-lg font-semibold tracking-tight">
            Tracks
          </h2>
          <p className="text-sm text-muted-foreground">
            What you&apos;re preparing for. Archived tracks keep their history but leave pickers.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "add-track" })}>
          <Plus />
          Add track
        </Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {tracks.map((t, i) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <Swatch color={t.color} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {t.name}
                {!t.isActive && <Badge variant="outline">Archived</Badge>}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.weeklyTargetMinutes
                  ? `${formatDuration(t.weeklyTargetMinutes * 60_000)} a week`
                  : "No weekly target"}{" "}
                · {t._count.topics} topics · {t._count.timeEntries} time entries
              </span>
            </div>
            <RowMenu
              kind="track"
              id={t.id}
              name={t.name}
              first={i === 0}
              last={i === tracks.length - 1}
              onEdit={() => setDialog({ kind: "edit-track", track: t })}
              onDelete={() => setDialog({ kind: "delete-track", track: t })}
            />
          </li>
        ))}
      </ul>
      <Dialog open={dialog?.kind.endsWith("track") ?? false} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {dialog?.kind === "add-track" && (
            <TrackForm onDone={close} defaultColor={SERIES[tracks.length % SERIES.length]!.light} />
          )}
          {dialog?.kind === "edit-track" && (
            <TrackForm key={dialog.track.id} track={dialog.track} onDone={close} />
          )}
          {dialog?.kind === "delete-track" && (
            <ConfirmDelete
              action={deleteTrackAction}
              id={dialog.track.id}
              title={`Delete “${dialog.track.name}”?`}
              description={`Its ${dialog.track._count.topics} topics and its goals go too. Time entries, notes and applications stay, without a track. Archive it instead to keep everything.`}
              onDone={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TrackForm({
  track,
  defaultColor,
  onDone,
}: {
  track?: TrackRow;
  defaultColor?: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveTrackAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [color, setColor] = useState(track?.color ?? defaultColor ?? SERIES[0].light);
  const err = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{track ? "Edit track" : "Add track"}</DialogTitle>
        <DialogDescription>
          Colors come from the chart palette so charts stay readable.
        </DialogDescription>
      </DialogHeader>
      {track && <input type="hidden" name="id" value={track.id} />}
      <FormField id="track-name" label="Name" error={err?.name}>
        <Input
          id="track-name"
          name="name"
          required
          maxLength={60}
          defaultValue={track?.name ?? ""}
          aria-invalid={Boolean(err?.name)}
        />
      </FormField>
      <FormField id="track-description" label="Description" optional error={err?.description}>
        <Input
          id="track-description"
          name="description"
          maxLength={200}
          defaultValue={track?.description ?? ""}
        />
      </FormField>
      <FormField
        id="track-target"
        label="Weekly target (hours)"
        optional
        error={err?.weeklyTargetHours}
      >
        <Input
          id="track-target"
          name="weeklyTargetHours"
          type="number"
          inputMode="decimal"
          min={0}
          max={168}
          step={0.5}
          defaultValue={track?.weeklyTargetMinutes ? track.weeklyTargetMinutes / 60 : ""}
        />
      </FormField>
      <ColorChoice name="color" value={color} onChange={setColor} />
      {track ? (
        <p className="text-sm text-muted-foreground">
          Edit this track&apos;s topics on the{" "}
          <Link href="/topics" className="underline underline-offset-2 hover:text-foreground">
            Topics
          </Link>{" "}
          page.
        </p>
      ) : (
        <TopicsField error={err?.topics} />
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={track?.isActive ?? true}
          className="size-4 accent-primary"
        />
        Active (uncheck to archive)
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

export function ActivitySettings({ activities }: { activities: ActivityTypeRow[] }) {
  const [dialog, setDialog] = useState<Dialogs | null>(null);
  const close = () => setDialog(null);
  return (
    <section aria-labelledby="activities-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="activities-heading" className="text-lg font-semibold tracking-tight">
            Activity types
          </h2>
          <p className="text-sm text-muted-foreground">
            What the timer can track. The category drives the dashboard (study, sleep, gaps).
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "add-activity" })}>
          <Plus />
          Add activity
        </Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {activities.map((a, i) => (
          <li key={a.id} className="flex items-center gap-3 px-4 py-3">
            <Swatch color={a.color} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {a.name}
                {a.isArchived && <Badge variant="outline">Archived</Badge>}
              </span>
              <span className="text-xs text-muted-foreground">
                {CATEGORY_LABEL[a.category]}
                {a.isProductive ? " · productive" : ""} · {a._count.timeEntries} entries
              </span>
            </div>
            <RowMenu
              kind="activity"
              id={a.id}
              name={a.name}
              first={i === 0}
              last={i === activities.length - 1}
              onEdit={() => setDialog({ kind: "edit-activity", activity: a })}
              onDelete={() => setDialog({ kind: "delete-activity", activity: a })}
            />
          </li>
        ))}
      </ul>
      <Dialog open={dialog?.kind.endsWith("activity") ?? false} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          {dialog?.kind === "add-activity" && <ActivityForm onDone={close} />}
          {dialog?.kind === "edit-activity" && (
            <ActivityForm key={dialog.activity.id} activity={dialog.activity} onDone={close} />
          )}
          {dialog?.kind === "delete-activity" && (
            <ConfirmDelete
              action={deleteActivityTypeAction}
              id={dialog.activity.id}
              title={`Delete “${dialog.activity.name}”?`}
              description={
                dialog.activity._count.timeEntries > 0
                  ? "It has time entries, so it can't be deleted — archive it from Edit instead."
                  : "It has no time entries. This can't be undone."
              }
              onDone={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ActivityForm({ activity, onDone }: { activity?: ActivityTypeRow; onDone: () => void }) {
  const [state, action, pending] = useToastAction(saveActivityTypeAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [color, setColor] = useState(activity?.color ?? SERIES[0].light);
  const [category, setCategory] = useState<ActivityCategory>(activity?.category ?? "OTHER");
  const err = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{activity ? "Edit activity" : "Add activity"}</DialogTitle>
        <DialogDescription>Shown on the timer and the timeline.</DialogDescription>
      </DialogHeader>
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <input type="hidden" name="category" value={category} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="activity-name" label="Name" error={err?.name}>
          <Input
            id="activity-name"
            name="name"
            required
            maxLength={40}
            defaultValue={activity?.name ?? ""}
            aria-invalid={Boolean(err?.name)}
          />
        </FormField>
        <FormField id="activity-category" label="Category">
          <Select value={category} onValueChange={(v) => setCategory(v as ActivityCategory)}>
            <SelectTrigger id="activity-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <ColorChoice name="color" value={color} onChange={setColor} includeNeutral />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isProductive"
          defaultChecked={activity?.isProductive ?? false}
          className="size-4 accent-primary"
        />
        Counts as productive time
      </label>
      {activity && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isArchived"
            defaultChecked={activity.isArchived}
            className="size-4 accent-primary"
          />
          Archived (hidden from the timer; history stays)
        </label>
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

function ConfirmDelete({
  action: serverAction,
  id,
  title,
  description,
  onDone,
}: {
  action: typeof deleteTrackAction;
  id: string;
  title: string;
  description: string;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(serverAction, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={id} />
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
