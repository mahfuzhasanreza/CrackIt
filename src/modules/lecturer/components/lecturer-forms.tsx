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
import {
  deleteLecturerRecordAction,
  saveCourseAction,
  saveDemoAction,
  savePublicationAction,
  saveVivaAction,
} from "../actions";
import { AUDIENCE_LABEL, PUBLICATION_STATUS_LABEL } from "../labels";
import type { CourseView, DemoView, PublicationView, VivaView } from "../service";
import { AUDIENCES, PUBLICATION_STATUSES } from "../validators";

const NONE = "__none";
type CourseRef = { id: string; name: string; code: string | null };
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

function CoursePicker({
  courses,
  value,
  onChange,
  error,
}: {
  courses: CourseRef[];
  value: string;
  onChange: (v: string) => void;
  error?: string[];
}) {
  return (
    <Field id="lecturer-course" label="Course" optional error={error}>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger id="lecturer-course" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No course</SelectItem>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.code ? `${c.code} · ${c.name}` : c.name}
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

// ── Course ──────────────────────────────────────────────────────────────────

export function CourseForm({ course, onDone }: { course?: CourseView; onDone: () => void }) {
  const [state, action, pending] = useToastAction(saveCourseAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const err: Errors = state.fieldErrors;
  return (
    <FormShell
      title={course ? "Edit course" : "Add course"}
      description="A subject you may be asked to teach."
      onSubmit={onSubmit}
      pending={pending}
      state={state}
    >
      {course && <input type="hidden" name="id" value={course.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field id="course-name" label="Name" error={err?.name}>
          <Input
            id="course-name"
            name="name"
            required
            maxLength={120}
            defaultValue={course?.name ?? ""}
            aria-invalid={Boolean(err?.name)}
          />
        </Field>
        <Field id="course-code" label="Code" optional>
          <Input id="course-code" name="code" maxLength={20} defaultValue={course?.code ?? ""} />
        </Field>
      </div>
      <Field id="course-syllabus" label="Syllabus link" optional error={err?.syllabusUrl}>
        <Input
          id="course-syllabus"
          name="syllabusUrl"
          type="url"
          defaultValue={course?.syllabusUrl ?? ""}
          aria-invalid={Boolean(err?.syllabusUrl)}
        />
      </Field>
      <RatingInput
        name="readiness"
        legend="Readiness"
        labels={["", "Not ready", "Shaky", "Okay", "Good", "Could teach it tomorrow"]}
        defaultValue={course?.readiness ?? 1}
        idPrefix="course"
        optional={false}
      />
      <Field id="course-notes" label="Notes (Markdown)" optional>
        {markdownArea(
          "course-notes",
          "notesMd",
          course?.notesMd ?? "",
          4,
          "- Weak units\n- Lab ideas",
        )}
      </Field>
    </FormShell>
  );
}

// ── Teaching demo ───────────────────────────────────────────────────────────

export function DemoForm({
  demo,
  courses,
  today,
  onDone,
}: {
  demo?: DemoView;
  courses: CourseRef[];
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveDemoAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [courseId, setCourseId] = useState(demo?.course?.id ?? "");
  const [audience, setAudience] = useState(demo?.audience ?? "SELF");
  const err: Errors = state.fieldErrors;
  return (
    <FormShell
      title={demo ? "Edit teaching demo" : "Log a teaching demo"}
      onSubmit={onSubmit}
      pending={pending}
      state={state}
    >
      {demo && <input type="hidden" name="id" value={demo.id} />}
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="audience" value={audience} />
      <Field id="demo-topic" label="Topic" error={err?.topic}>
        <Input
          id="demo-topic"
          name="topic"
          required
          maxLength={200}
          defaultValue={demo?.topic ?? ""}
          placeholder="e.g. Introduction to recursion"
          aria-invalid={Boolean(err?.topic)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <CoursePicker
          courses={courses}
          value={courseId}
          onChange={setCourseId}
          error={err?.courseId}
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
          "- What went well\n- Pace, board work, questions\n- Fix next time",
        )}
      </Field>
    </FormShell>
  );
}

// ── Publication ─────────────────────────────────────────────────────────────

export function PublicationForm({
  publication,
  today,
  onDone,
}: {
  publication?: PublicationView;
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(savePublicationAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [status, setStatus] = useState(publication?.status ?? "IDEA");
  const err: Errors = state.fieldErrors;
  return (
    <FormShell
      title={publication ? "Edit publication" : "Add publication"}
      description="Past “writing”, the submission date defaults to today if left empty."
      onSubmit={onSubmit}
      pending={pending}
      state={state}
    >
      {publication && <input type="hidden" name="id" value={publication.id} />}
      <input type="hidden" name="status" value={status} />
      <Field id="pub-title" label="Title" error={err?.title}>
        <Input
          id="pub-title"
          name="title"
          required
          maxLength={300}
          defaultValue={publication?.title ?? ""}
          aria-invalid={Boolean(err?.title)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pub-venue" label="Venue" optional>
          <Input
            id="pub-venue"
            name="venue"
            maxLength={200}
            defaultValue={publication?.venue ?? ""}
            placeholder="Journal or conference"
          />
        </Field>
        <Field id="pub-status" label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger id="pub-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PUBLICATION_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pub-submitted" label="Submitted on" optional error={err?.submittedOn}>
          <Input
            id="pub-submitted"
            name="submittedOn"
            type="date"
            max={today}
            defaultValue={publication?.submittedOn ?? ""}
            aria-invalid={Boolean(err?.submittedOn)}
          />
        </Field>
        <Field id="pub-url" label="Link" optional error={err?.url}>
          <Input
            id="pub-url"
            name="url"
            type="url"
            defaultValue={publication?.url ?? ""}
            aria-invalid={Boolean(err?.url)}
          />
        </Field>
      </div>
      <Field id="pub-notes" label="Notes (Markdown)" optional>
        {markdownArea("pub-notes", "notesMd", publication?.notesMd ?? "", 4)}
      </Field>
    </FormShell>
  );
}

// ── Viva question ───────────────────────────────────────────────────────────

export function VivaForm({
  question,
  courses,
  onDone,
}: {
  question?: VivaView;
  courses: CourseRef[];
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveVivaAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [courseId, setCourseId] = useState(question?.course?.id ?? "");
  const err: Errors = state.fieldErrors;
  return (
    <FormShell
      title={question ? "Edit question" : "Add viva question"}
      description="Practised on the 1, 3, 7, 14, 30-day schedule."
      onSubmit={onSubmit}
      pending={pending}
      state={state}
    >
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="courseId" value={courseId} />
      <Field id="viva-question" label="Question" error={err?.question}>
        <Textarea
          id="viva-question"
          name="question"
          required
          rows={2}
          maxLength={1000}
          defaultValue={question?.question ?? ""}
          aria-invalid={Boolean(err?.question)}
        />
      </Field>
      <CoursePicker
        courses={courses}
        value={courseId}
        onChange={setCourseId}
        error={err?.courseId}
      />
      <Field id="viva-answer" label="Model answer (Markdown)" optional>
        {markdownArea("viva-answer", "answerMd", question?.answerMd ?? "", 6)}
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
  kind: "course" | "demo" | "publication" | "viva";
  id: string;
  label: string;
  note?: string;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(deleteLecturerRecordAction, onDone);
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
