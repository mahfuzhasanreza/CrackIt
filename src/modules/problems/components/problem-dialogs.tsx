"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToastAction } from "@/hooks/use-toast-action";
import { cn } from "@/lib/utils";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import type { TrackOption } from "../../tracks-topics/repository";
import { deleteProblemAction, logAttemptAction, saveProblemAction } from "../actions";
import { DIFFICULTY_LABEL, PLATFORM_LABEL, STATUS_LABEL } from "../labels";
import type { ProblemView } from "../service";
import { DIFFICULTIES, PLATFORMS, STATUSES } from "../validators";

const NONE = "__none";

export function AddProblemButton({ tracks }: { tracks: TrackOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add problem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {open && <ProblemForm tracks={tracks} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label} {optional && <span className="text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error?.[0] && <p className="text-sm text-destructive">{error[0]}</p>}
    </div>
  );
}

function EnumSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  labels,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Add or edit a problem. */
export function ProblemForm({
  problem,
  tracks,
  onDone,
}: {
  problem?: ProblemView;
  tracks: TrackOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveProblemAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [platform, setPlatform] = useState(problem?.platform ?? "LEETCODE");
  const [difficulty, setDifficulty] = useState(problem?.difficulty ?? "MEDIUM");
  const [status, setStatus] = useState(problem?.status ?? "TODO");
  const [topicId, setTopicId] = useState(problem?.topic?.id ?? "");
  const [notes, setNotes] = useState(problem?.notesMd ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const err = state.fieldErrors;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{problem ? "Edit problem" : "Add problem"}</DialogTitle>
        <DialogDescription>
          Solved problems come back for revision after 1, 3, 7, 14 and 30 days.
        </DialogDescription>
      </DialogHeader>
      {problem && <input type="hidden" name="id" value={problem.id} />}
      <input type="hidden" name="platform" value={platform} />
      <input type="hidden" name="difficulty" value={difficulty} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="topicId" value={topicId} />

      <Field id="problem-title" label="Title" error={err?.title}>
        <Input
          id="problem-title"
          name="title"
          required
          maxLength={200}
          defaultValue={problem?.title ?? ""}
          placeholder="e.g. Course Schedule II"
          aria-invalid={Boolean(err?.title)}
        />
      </Field>
      <Field id="problem-url" label="Link" optional error={err?.url}>
        <Input
          id="problem-url"
          name="url"
          type="url"
          defaultValue={problem?.url ?? ""}
          placeholder="https://leetcode.com/problems/…"
          aria-invalid={Boolean(err?.url)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="problem-platform" label="Platform">
          <EnumSelect
            id="problem-platform"
            value={platform}
            onChange={setPlatform}
            options={PLATFORMS}
            labels={PLATFORM_LABEL}
          />
        </Field>
        <Field id="problem-difficulty" label="Difficulty">
          <EnumSelect
            id="problem-difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTIES}
            labels={DIFFICULTY_LABEL}
          />
        </Field>
        <Field id="problem-status" label="Status">
          <EnumSelect
            id="problem-status"
            value={status}
            onChange={setStatus}
            options={STATUSES}
            labels={STATUS_LABEL}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="problem-tags" label="Patterns" optional error={err?.tags}>
          <Input
            id="problem-tags"
            name="tags"
            defaultValue={problem?.tags.join(", ") ?? ""}
            placeholder="graphs, topological sort"
            aria-invalid={Boolean(err?.tags)}
          />
        </Field>
        <Field id="problem-topic" label="Topic" optional error={err?.topicId}>
          <Select value={topicId || NONE} onValueChange={(v) => setTopicId(v === NONE ? "" : v)}>
            <SelectTrigger id="problem-topic" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No topic</SelectItem>
              {tracks.map((t) => (
                <SelectGroup key={t.id}>
                  <SelectLabel>{t.name}</SelectLabel>
                  {t.topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      <span style={{ paddingLeft: `${topic.depth * 0.75}rem` }}>
                        {topic.label.split(" › ").at(-1)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field id="problem-time" label="Total time spent (minutes)" error={err?.timeSpentMin}>
        <Input
          id="problem-time"
          name="timeSpentMin"
          type="number"
          min={0}
          className="w-40"
          defaultValue={problem?.timeSpentMin ?? 0}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor="problem-notes">
            Notes <span className="text-muted-foreground">(approach, edge cases; Markdown)</span>
          </Label>
          <div role="tablist" aria-label="Editor mode" className="flex gap-1 text-sm">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-2.5 py-1 capitalize",
                  tab === t
                    ? "bg-accent font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          id="problem-notes"
          name="notesMd"
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn("font-mono text-[0.8125rem]", tab === "preview" && "hidden")}
        />
        {tab === "preview" && (
          <div className="min-h-36 rounded-md border px-3 py-2">
            {notes.trim() ? (
              <Markdown>{notes}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        )}
        {err?.notesMd && <p className="text-sm text-destructive">{err.notesMd[0]}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="scheduleReview"
          defaultChecked={
            problem
              ? problem.nextReviewOn !== null ||
                problem.status === "TODO" ||
                problem.status === "ATTEMPTED"
              : true
          }
          className="size-4 accent-primary"
        />
        Schedule revisions once solved
      </label>

      {state.status === "error" && state.message && !err && (
        <p role="status" className="text-sm text-destructive">
          {state.message}
        </p>
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

export function AttemptForm({ problem, onDone }: { problem: ProblemView; onDone: () => void }) {
  const [state, action, pending] = useToastAction(logAttemptAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Log an attempt</DialogTitle>
        <DialogDescription>{problem.title}</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={problem.id} />
      <Field id="attempt-minutes" label="Minutes spent" error={state.fieldErrors?.minutes}>
        <Input
          id="attempt-minutes"
          name="minutes"
          type="number"
          min={0}
          max={1440}
          required
          autoFocus
          className="w-32"
          aria-invalid={Boolean(state.fieldErrors?.minutes)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="solved" className="size-4 accent-primary" />
        Solved it
      </label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Log attempt
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteProblemForm({
  problem,
  onDone,
}: {
  problem: ProblemView;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(deleteProblemAction, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete “{problem.title}”?</DialogTitle>
        <DialogDescription>Its attempts, notes and revision schedule go with it.</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={problem.id} />
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
