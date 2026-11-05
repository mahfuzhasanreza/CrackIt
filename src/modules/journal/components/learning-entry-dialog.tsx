"use client";

import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
import { RatingInput } from "@/components/rating-input";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import type { TrackOption } from "../../tracks-topics/repository";
import { deleteLearningEntryAction, saveLearningEntryAction } from "../actions";
import type { LearningEntryView } from "../service";

import { useToastAction } from "./use-toast-action";

const NONE = "__none";
const CONFIDENCE = ["", "Shaky", "Vague", "Okay", "Solid", "Could teach it"];

type Target = { mode: "add"; dateKey: string } | { mode: "edit"; entry: LearningEntryView };

/** Button that opens the add/edit learning entry dialog. */
export function LearningEntryButton({
  target,
  tracks,
  today,
  variant = target.mode === "add" ? "default" : "ghost",
}: {
  target: Target;
  tracks: TrackOption[];
  today: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {target.mode === "add" ? (
          <Button variant={variant}>
            <Plus />
            Add what I learned
          </Button>
        ) : (
          <Button variant={variant} size="icon" aria-label={`Edit "${target.entry.title}"`}>
            <Pencil />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        {open && (
          <LearningEntryForm
            target={target}
            tracks={tracks}
            today={today}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LearningEntryForm({
  target,
  tracks,
  today,
  onDone,
}: {
  target: Target;
  tracks: TrackOption[];
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveLearningEntryAction, onDone);
  const onSubmit = useNoResetSubmit(action);

  const entry = target.mode === "edit" ? target.entry : null;
  const [trackId, setTrackId] = useState(entry?.track?.id ?? "");
  const [topicId, setTopicId] = useState(entry?.topic?.id ?? "");
  const [content, setContent] = useState(entry?.contentMd ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const track = tracks.find((t) => t.id === trackId);
  const err = state.fieldErrors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{entry ? "Edit learning entry" : "What did you learn?"}</DialogTitle>
        <DialogDescription>
          Notes support Markdown: **bold**, `code`, lists, tables and links.
        </DialogDescription>
      </DialogHeader>

      <form id="learning-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {entry && <input type="hidden" name="id" value={entry.id} />}
        <input type="hidden" name="trackId" value={trackId} />
        <input type="hidden" name="topicId" value={topicId} />

        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field id="learning-title" label="Title" error={err?.title}>
            <Input
              id="learning-title"
              name="title"
              required
              maxLength={200}
              defaultValue={entry?.title ?? ""}
              placeholder="e.g. Dijkstra needs non-negative weights"
              aria-invalid={Boolean(err?.title)}
            />
          </Field>
          <Field id="learning-date" label="Date" error={err?.date}>
            <Input
              id="learning-date"
              name="date"
              type="date"
              required
              max={today}
              defaultValue={entry?.dateKey ?? (target.mode === "add" ? target.dateKey : today)}
              aria-invalid={Boolean(err?.date)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="learning-track" label="Track" optional error={err?.trackId}>
            <Select
              value={trackId || NONE}
              onValueChange={(v) => {
                setTrackId(v === NONE ? "" : v);
                setTopicId("");
              }}
            >
              <SelectTrigger id="learning-track" className="w-full">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No track</SelectItem>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="learning-topic" label="Topic" optional error={err?.topicId}>
            <Select
              value={topicId || NONE}
              onValueChange={(v) => setTopicId(v === NONE ? "" : v)}
              disabled={!track}
            >
              <SelectTrigger id="learning-topic" className="w-full">
                <SelectValue placeholder={track ? "Topic" : "Pick a track first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No topic</SelectItem>
                {track?.topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span style={{ paddingLeft: `${t.depth * 0.75}rem` }}>
                      {t.label.split(" › ").at(-1)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2">
            <Label htmlFor="learning-content">Notes</Label>
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
          {/* The textarea stays mounted (hidden in preview) so its value is always submitted. */}
          <Textarea
            id="learning-content"
            name="contentMd"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"- Key idea\n- Example\n\n```ts\ncode\n```"}
            className={cn("font-mono text-[0.8125rem]", tab === "preview" && "hidden")}
            aria-invalid={Boolean(err?.contentMd)}
          />
          {tab === "preview" && (
            <div className="min-h-56 rounded-md border px-3 py-2">
              {content.trim() ? (
                <Markdown>{content}</Markdown>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
              )}
            </div>
          )}
          {err?.contentMd && <p className="text-sm text-destructive">{err.contentMd[0]}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="learning-tags" label="Tags" optional error={err?.tags}>
            <Input
              id="learning-tags"
              name="tags"
              defaultValue={entry?.tags.join(", ") ?? ""}
              placeholder="graphs, shortest path"
              aria-invalid={Boolean(err?.tags)}
            />
          </Field>
          <Field id="learning-source" label="Source link" optional error={err?.sourceUrl}>
            <Input
              id="learning-source"
              name="sourceUrl"
              type="url"
              defaultValue={entry?.sourceUrl ?? ""}
              placeholder="https://…"
              aria-invalid={Boolean(err?.sourceUrl)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <RatingInput
            name="confidence"
            legend="Confidence"
            labels={CONFIDENCE}
            defaultValue={entry?.confidence}
            idPrefix="learning"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="scheduleReview"
              defaultChecked={entry ? entry.revisitOn !== null : true}
              className="size-4 accent-primary"
            />
            Schedule revisions (1, 3, 7, 14, 30 days)
          </label>
        </div>

        {state.status === "error" && state.message && !err && (
          <p role="status" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
      </form>

      <DialogFooter className="gap-2 sm:justify-between">
        {entry ? <DeleteButton id={entry.id} onDone={onDone} /> : <span />}
        <Button type="submit" form="learning-form" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </>
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

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [, action, pending] = useToastAction(deleteLearningEntryAction, onDone);
  const [confirming, setConfirming] = useState(false);

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
