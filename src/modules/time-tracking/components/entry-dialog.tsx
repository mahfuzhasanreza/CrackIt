"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toLocalDateTimeInput } from "@/lib/dates";

import { initialActionState } from "@/lib/action-state";
import { deleteEntryAction, saveEntryAction } from "../actions";
import type { EntryOptions } from "../options";
import type { TimeEntryView } from "../service";

import { FocusRating } from "./focus-rating";
import { useActionFeedback, useNoResetSubmit } from "./hooks";
import { RefPickers } from "./ref-pickers";

export type EntryDialogTarget =
  { mode: "add"; start: Date; end: Date } | { mode: "edit"; entry: TimeEntryView };

type Props = {
  target: EntryDialogTarget | null;
  onClose: () => void;
  options: EntryOptions;
  timezone: string;
};

export function EntryDialog({ target, onClose, options, timezone }: Props) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {target && (
          // Remount per target so form state resets.
          <EntryForm
            key={target.mode === "edit" ? target.entry.id : target.start.toISOString()}
            target={target}
            onDone={onClose}
            options={options}
            timezone={timezone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  target,
  onDone,
  options,
  timezone,
}: {
  target: EntryDialogTarget;
  onDone: () => void;
  options: EntryOptions;
  timezone: string;
}) {
  const [state, action, pending] = useActionState(saveEntryAction, initialActionState);
  useActionFeedback(state, onDone);
  const onSubmit = useNoResetSubmit(action);

  const entry = target.mode === "edit" ? target.entry : null;
  const running = entry !== null && entry.endedAt === null;
  const start = entry?.startedAt ?? (target.mode === "add" ? target.start : new Date());
  const end = entry ? entry.endedAt : target.mode === "add" ? target.end : null;
  const err = state.fieldErrors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{entry ? "Edit entry" : "Add time entry"}</DialogTitle>
        <DialogDescription>
          {running
            ? "This timer is still running. You can correct when it started."
            : "Times are in your timezone. Entries can't overlap."}
        </DialogDescription>
      </DialogHeader>

      <form id="entry-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {entry && <input type="hidden" name="id" value={entry.id} />}
        <RefPickers
          idPrefix="entry"
          options={options}
          fieldErrors={err}
          defaults={{
            activityTypeId: entry?.activityTypeId ?? "",
            trackId: entry?.trackId ?? "",
            topicId: entry?.topicId ?? "",
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-start">Start</Label>
            <Input
              id="entry-start"
              name="startedAt"
              type="datetime-local"
              required
              defaultValue={toLocalDateTimeInput(start, timezone)}
              aria-invalid={Boolean(err?.startedAt)}
            />
            {err?.startedAt && <p className="text-sm text-destructive">{err.startedAt[0]}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-end">End</Label>
            {running ? (
              <p className="flex h-9 items-center text-sm text-muted-foreground">Still running</p>
            ) : (
              <Input
                id="entry-end"
                name="endedAt"
                type="datetime-local"
                required
                defaultValue={end ? toLocalDateTimeInput(end, timezone) : ""}
                aria-invalid={Boolean(err?.endedAt)}
              />
            )}
            {err?.endedAt && <p className="text-sm text-destructive">{err.endedAt[0]}</p>}
          </div>
        </div>
        <FocusRating idPrefix="entry" defaultValue={entry?.focusRating} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="entry-note">
            Note <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea id="entry-note" name="note" rows={2} defaultValue={entry?.note ?? ""} />
        </div>
        {state.status === "error" && state.message && !err && (
          <p role="status" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
      </form>

      <DialogFooter className="gap-2 sm:justify-between">
        {entry ? <DeleteButton id={entry.id} onDone={onDone} /> : <span />}
        <Button type="submit" form="entry-form" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(deleteEntryAction, initialActionState);
  const [confirming, setConfirming] = useState(false);
  useActionFeedback(state, onDone);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="text-destructive"
        onClick={() => setConfirming(true)}
      >
        <Trash2 />
        Delete
      </Button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm">Delete this entry?</span>
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />}
        Yes, delete
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  );
}
