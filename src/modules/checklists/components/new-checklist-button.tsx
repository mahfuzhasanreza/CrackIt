"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToastAction } from "@/hooks/use-toast-action";
import { cn } from "@/lib/utils";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import { createChecklistAction } from "../actions";

import { ChecklistFormFields, type TrackChoice } from "./checklist-form-fields";

const TYPES = [
  { value: "HABIT", label: "Habits", hint: "Repeat daily or weekly, with streaks" },
  { value: "ROADMAP", label: "Roadmap", hint: "Ordered steps toward a goal" },
  { value: "ONE_OFF", label: "To-do list", hint: "One-time tasks with due dates" },
] as const;

export function NewChecklistButton({ tracks }: { tracks: TrackChoice[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New checklist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {open && <NewChecklistForm tracks={tracks} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewChecklistForm({ tracks, onDone }: { tracks: TrackChoice[]; onDone: () => void }) {
  const [state, action, pending] = useToastAction(createChecklistAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("HABIT");
  const [recurrence, setRecurrence] = useState<"DAILY" | "WEEKLY">("DAILY");

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>New checklist</DialogTitle>
        <DialogDescription>The type can&apos;t be changed later.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="type" value={type} />
      {type === "HABIT" && <input type="hidden" name="recurrence" value={recurrence} />}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-md border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                type === t.value && "border-primary bg-accent",
              )}
            >
              <input
                type="radio"
                name="type-choice"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="sr-only"
              />
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === "HABIT" && (
        <fieldset className="flex gap-4 text-sm">
          <legend className="mb-2 text-sm font-medium">Repeats</legend>
          {(["DAILY", "WEEKLY"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrence-choice"
                checked={recurrence === r}
                onChange={() => setRecurrence(r)}
                className="size-4 accent-primary"
              />
              {r === "DAILY" ? "Every day" : "Every week"}
            </label>
          ))}
        </fieldset>
      )}

      <ChecklistFormFields tracks={tracks} fieldErrors={state.fieldErrors} />

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Create
        </Button>
      </DialogFooter>
    </form>
  );
}
