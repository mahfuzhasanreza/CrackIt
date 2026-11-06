"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { RatingInput } from "@/components/rating-input";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import type { ActionState } from "@/lib/action-state";
import { useToastAction } from "@/hooks/use-toast-action";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import { deletePracticeRecordAction, savePresentationAction, saveQuestionAction } from "../actions";
import { AUDIENCE_LABEL } from "../labels";
import type { PresentationView, QuestionView } from "../service";
import { AUDIENCES } from "../validators";

const NONE = "__none";
export type TrackRef = { id: string; name: string; color: string };
type Errors = ActionState["fieldErrors"];

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

function FormShell({
  title,
  description,
  onSubmit,
  pending,
  state,
  children,
}: {
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  state: ActionState;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className={description ? undefined : "sr-only"}>
          {description ?? title}
        </DialogDescription>
      </DialogHeader>
      {children}
      {state.status === "error" && state.message && !state.fieldErrors && (
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

function TrackPicker({
  tracks,
  value,
  onChange,
  error,
  idPrefix,
}: {
  tracks: TrackRef[];
  value: string;
  onChange: (v: string) => void;
  error?: string[];
  idPrefix: string;
}) {
  return (
    <Field id={`${idPrefix}-track`} label="Track" optional error={error}>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger id={`${idPrefix}-track`} className="w-full">
          <SelectValue />
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
  );
}

const markdownArea = (id: string, name: string, value: string, rows = 5, placeholder?: string) => (
  <Textarea
    id={id}
    name={name}
    rows={rows}
    defaultValue={value}
    placeholder={placeholder}
    className="font-mono text-[0.8125rem]"
  />
);

export function PresentationForm({
  demo,
  tracks,
  today,
  onDone,
}: {
  demo?: PresentationView;
  tracks: TrackRef[];
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(savePresentationAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [trackId, setTrackId] = useState(demo?.track?.id ?? "");
  const [audience, setAudience] = useState(demo?.audience ?? "SELF");
  const err: Errors = state.fieldErrors;
  return (
    <FormShell
      title={demo ? "Edit presentation" : "Log a presentation"}
      description="A talk, demo, teaching session or pitch — practice or real."
      onSubmit={onSubmit}
      pending={pending}
      state={state}
    >
      {demo && <input type="hidden" name="id" value={demo.id} />}
      <input type="hidden" name="trackId" value={trackId} />
      <input type="hidden" name="audience" value={audience} />
      <Field id="demo-title" label="Title" error={err?.title}>
        <Input
          id="demo-title"
          name="title"
          required
          maxLength={200}
          defaultValue={demo?.title ?? ""}
          placeholder="e.g. Project walkthrough, Intro to recursion"
          aria-invalid={Boolean(err?.title)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <TrackPicker
          tracks={tracks}
          value={trackId}
          onChange={setTrackId}
          error={err?.trackId}
          idPrefix="demo"
        />
        <Field id="demo-audience" label="Audience">
          <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
            <SelectTrigger id="demo-audience" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCES.map((a) => (
                <SelectItem key={a} value={a}>
                  {AUDIENCE_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="demo-date" label="Date" error={err?.date}>
          <Input
            id="demo-date"
            name="date"
            type="date"
            required
            max={today}
            defaultValue={demo?.dateKey ?? today}
            aria-invalid={Boolean(err?.date)}
          />
        </Field>
        <Field id="demo-duration" label="Duration (minutes)" error={err?.durationMin}>
          <Input
            id="demo-duration"
            name="durationMin"
            type="number"
            min={1}
            max={600}
            required
            defaultValue={demo?.durationMin ?? 15}
            aria-invalid={Boolean(err?.durationMin)}
          />
        </Field>
      </div>
      <RatingInput
        name="selfScore"
        legend="Self-score"
        labels={["", "Poor", "Weak", "Okay", "Good", "Excellent"]}
        defaultValue={demo?.selfScore}
        idPrefix="demo"
      />
      <Field id="demo-recording" label="Recording link" optional error={err?.recordingUrl}>
        <Input
          id="demo-recording"
          name="recordingUrl"
          type="url"
          defaultValue={demo?.recordingUrl ?? ""}
          aria-invalid={Boolean(err?.recordingUrl)}
        />
      </Field>
      <Field id="demo-feedback" label="Feedback (Markdown)" optional>
        {markdownArea(
          "demo-feedback",
          "feedbackMd",
          demo?.feedbackMd ?? "",
          5,
          "- What went well\n- Pace, clarity, questions\n- Fix next time",
        )}
      </Field>
    </FormShell>
  );
}

export function QuestionForm({
  question,
  tracks,
  onDone,
}: {
  question?: QuestionView;
  tracks: TrackRef[];
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveQuestionAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [trackId, setTrackId] = useState(question?.track?.id ?? "");
  const err: Errors = state.fieldErrors;
  return (
    <FormShell
      title={question ? "Edit question" : "Add a question"}
      description="Practised on the 1, 3, 7, 14, 30-day schedule."
      onSubmit={onSubmit}
      pending={pending}
      state={state}
    >
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="trackId" value={trackId} />
      <Field id="question-question" label="Question" error={err?.question}>
        <Textarea
          id="question-question"
          name="question"
          required
          rows={2}
          maxLength={1000}
          defaultValue={question?.question ?? ""}
          aria-invalid={Boolean(err?.question)}
        />
      </Field>
      <TrackPicker
        tracks={tracks}
        value={trackId}
        onChange={setTrackId}
        error={err?.trackId}
        idPrefix="question"
      />
      <Field id="question-answer" label="Model answer (Markdown)" optional>
        {markdownArea("question-answer", "answerMd", question?.answerMd ?? "", 6)}
      </Field>
    </FormShell>
  );
}

// ── Delete ──────────────────────────────────────────────────────────────────

export function DeleteForm({
  kind,
  id,
  label,
  note,
  onDone,
}: {
  kind: "presentation" | "question";
  id: string;
  label: string;
  note?: string;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(deletePracticeRecordAction, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete “{label}”?</DialogTitle>
        <DialogDescription>{note ?? "This can't be undone."}</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
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
