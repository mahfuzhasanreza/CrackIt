"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { FormField as Field } from "@/components/form-field";
import { RatingInput } from "@/components/rating-input";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApplicationStatus,
  InterviewOutcome,
  InterviewRound,
  OrganizationType,
} from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";
import type { ActionState } from "@/lib/action-state";
import { toDateKey, toLocalDateTimeInput } from "@/lib/dates";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import {
  deleteJobRecordAction,
  saveApplicationAction,
  saveInterviewAction,
  saveMockAction,
  saveOrganizationAction,
} from "../actions";
import { ORG_TYPE_LABEL, OUTCOME_LABEL, ROUND_LABEL, STATUS_LABEL } from "../labels";
import { ORG_TYPES, OUTCOMES, ROUNDS, STATUSES } from "../validators";

const NONE = "__none";
const NEW_APPLICATION = "__new";
export type TrackChoice = { id: string; name: string; color: string };

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

function TrackSelect({
  tracks,
  value,
  onChange,
}: {
  tracks: TrackChoice[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field id="job-track" label="Track" optional>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger id="job-track" className="w-full">
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

function Shell({
  title,
  description,
  state,
  pending,
  onSubmit,
  children,
}: {
  title: string;
  description?: string;
  state: ActionState;
  pending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
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

const md = (id: string, name: string, value: string, rows = 4, placeholder?: string) => (
  <Textarea
    id={id}
    name={name}
    rows={rows}
    defaultValue={value}
    placeholder={placeholder}
    className="font-mono text-[0.8125rem]"
  />
);

// ── Application ─────────────────────────────────────────────────────────────

export type ApplicationDefaults = {
  id: string;
  role: string;
  status: ApplicationStatus;
  organization: { name: string; type: OrganizationType };
  track: { id: string } | null;
  jobUrl: string | null;
  source: string | null;
  appliedOn: string | null;
  deadlineOn: string | null;
  salaryRange: string | null;
  notesMd: string;
};

export function ApplicationForm({
  application,
  initialStatus = "WISHLIST",
  organizations,
  tracks,
  today,
  onDone,
}: {
  application?: ApplicationDefaults;
  initialStatus?: ApplicationStatus;
  organizations: string[];
  tracks: TrackChoice[];
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveApplicationAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? initialStatus);
  const [orgType, setOrgType] = useState<OrganizationType>(
    application?.organization.type ?? "COMPANY",
  );
  const [trackId, setTrackId] = useState(application?.track?.id ?? "");
  const err = state.fieldErrors;

  return (
    <Shell
      title={application ? "Edit application" : "Add application"}
      description="A new organization name creates the organization."
      state={state}
      pending={pending}
      onSubmit={onSubmit}
    >
      {application && <input type="hidden" name="id" value={application.id} />}
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="organizationType" value={orgType} />
      <input type="hidden" name="trackId" value={trackId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field id="app-org" label="Organization" error={err?.organizationName}>
          <Input
            id="app-org"
            name="organizationName"
            required
            maxLength={120}
            list="app-org-options"
            autoComplete="off"
            defaultValue={application?.organization.name ?? ""}
            aria-invalid={Boolean(err?.organizationName)}
          />
          <datalist id="app-org-options">
            {organizations.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field id="app-org-type" label="Type">
          <EnumSelect
            id="app-org-type"
            value={orgType}
            onChange={setOrgType}
            options={ORG_TYPES}
            labels={ORG_TYPE_LABEL}
          />
        </Field>
      </div>
      <Field id="app-role" label="Role" error={err?.role}>
        <Input
          id="app-role"
          name="role"
          required
          maxLength={200}
          defaultValue={application?.role ?? ""}
          placeholder="e.g. Software Engineer II / Lecturer, CSE"
          aria-invalid={Boolean(err?.role)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="app-status" label="Status">
          <EnumSelect
            id="app-status"
            value={status}
            onChange={setStatus}
            options={STATUSES}
            labels={STATUS_LABEL}
          />
        </Field>
        <TrackSelect tracks={tracks} value={trackId} onChange={setTrackId} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="app-applied" label="Applied on" optional error={err?.appliedOn}>
          <Input
            id="app-applied"
            name="appliedOn"
            type="date"
            max={today}
            defaultValue={application?.appliedOn ?? ""}
            aria-invalid={Boolean(err?.appliedOn)}
          />
        </Field>
        <Field id="app-deadline" label="Deadline" optional error={err?.deadlineOn}>
          <Input
            id="app-deadline"
            name="deadlineOn"
            type="date"
            defaultValue={application?.deadlineOn ?? ""}
          />
        </Field>
      </div>
      <Field id="app-url" label="Job posting" optional error={err?.jobUrl}>
        <Input
          id="app-url"
          name="jobUrl"
          type="url"
          defaultValue={application?.jobUrl ?? ""}
          aria-invalid={Boolean(err?.jobUrl)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="app-source" label="Source" optional>
          <Input
            id="app-source"
            name="source"
            maxLength={100}
            defaultValue={application?.source ?? ""}
            placeholder="LinkedIn, referral, circular…"
          />
        </Field>
        <Field id="app-salary" label="Salary range" optional>
          <Input
            id="app-salary"
            name="salaryRange"
            maxLength={100}
            defaultValue={application?.salaryRange ?? ""}
          />
        </Field>
      </div>
      <Field id="app-notes" label="Notes (Markdown)" optional>
        {md("app-notes", "notesMd", application?.notesMd ?? "")}
      </Field>
    </Shell>
  );
}

// ── Interview ───────────────────────────────────────────────────────────────

export type InterviewDefaults = {
  id: string;
  applicationId: string;
  round: InterviewRound;
  scheduledAt: Date;
  durationMin: number | null;
  interviewer: string | null;
  outcome: InterviewOutcome;
  selfRating: number | null;
  questionsMd: string;
  myAnswersMd: string;
  lessonsMd: string;
};

export function InterviewForm({
  interview,
  applicationId,
  applications,
  timezone,
  onDone,
}: {
  interview?: InterviewDefaults;
  /** Fixed application (detail page); otherwise pick from `applications`. */
  applicationId?: string;
  applications?: { id: string; role: string; organization: { name: string } }[];
  timezone: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveInterviewAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [appId, setAppId] = useState(
    interview?.applicationId ??
      applicationId ??
      (applications && applications.length === 0 ? NEW_APPLICATION : ""),
  );
  const creatingApp = appId === NEW_APPLICATION;
  const [round, setRound] = useState<InterviewRound>(interview?.round ?? "TECHNICAL");
  const [outcome, setOutcome] = useState<InterviewOutcome>(interview?.outcome ?? "PENDING");
  const err = state.fieldErrors;
  // Default for a new interview: tomorrow at 10:00 in the user's timezone (computed once).
  const [defaultTime] = useState(
    () => `${toDateKey(new Date(Date.now() + 86_400_000), timezone)}T10:00`,
  );

  return (
    <Shell
      title={interview ? "Edit interview" : "Add interview"}
      description={
        interview ? undefined : "Adding one moves the application to OA or Interviewing."
      }
      state={state}
      pending={pending}
      onSubmit={onSubmit}
    >
      {interview && <input type="hidden" name="id" value={interview.id} />}
      <input type="hidden" name="applicationId" value={creatingApp ? "" : appId} />
      <input type="hidden" name="round" value={round} />
      <input type="hidden" name="outcome" value={outcome} />
      {!applicationId && !interview && applications && (
        <Field id="interview-app" label="Application" error={err?.applicationId}>
          <Select value={appId} onValueChange={setAppId}>
            <SelectTrigger
              id="interview-app"
              className="w-full"
              aria-invalid={Boolean(err?.applicationId)}
            >
              <SelectValue placeholder="Which application?" />
            </SelectTrigger>
            <SelectContent>
              {applications.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.organization.name} · {a.role}
                </SelectItem>
              ))}
              <SelectItem value={NEW_APPLICATION}>+ New application…</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      {creatingApp && (
        <div className="grid gap-4 rounded-lg border border-dashed p-3 sm:grid-cols-2">
          <Field id="interview-new-org" label="Organization" error={err?.newOrganizationName}>
            <Input
              id="interview-new-org"
              name="newOrganizationName"
              maxLength={120}
              list="interview-org-names"
              required
              aria-invalid={Boolean(err?.newOrganizationName)}
            />
            <datalist id="interview-org-names">
              {[...new Set((applications ?? []).map((a) => a.organization.name))].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field id="interview-new-role" label="Role" error={err?.newRole}>
            <Input
              id="interview-new-role"
              name="newRole"
              maxLength={200}
              required
              aria-invalid={Boolean(err?.newRole)}
            />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Creates the application as Applied (today); you can edit it on the board.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="interview-round" label="Round">
          <EnumSelect
            id="interview-round"
            value={round}
            onChange={setRound}
            options={ROUNDS}
            labels={ROUND_LABEL}
          />
        </Field>
        <Field id="interview-outcome" label="Outcome" error={err?.outcome}>
          <EnumSelect
            id="interview-outcome"
            value={outcome}
            onChange={setOutcome}
            options={OUTCOMES}
            labels={OUTCOME_LABEL}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field id="interview-time" label="When" error={err?.scheduledAt}>
          <Input
            id="interview-time"
            name="scheduledAt"
            type="datetime-local"
            required
            defaultValue={
              interview ? toLocalDateTimeInput(interview.scheduledAt, timezone) : defaultTime
            }
            aria-invalid={Boolean(err?.scheduledAt)}
          />
        </Field>
        <Field id="interview-duration" label="Minutes" optional error={err?.durationMin}>
          <Input
            id="interview-duration"
            name="durationMin"
            type="number"
            min={1}
            max={1440}
            defaultValue={interview?.durationMin ?? ""}
          />
        </Field>
      </div>
      <Field id="interview-who" label="Interviewer(s)" optional>
        <Input
          id="interview-who"
          name="interviewer"
          maxLength={200}
          defaultValue={interview?.interviewer ?? ""}
        />
      </Field>
      <RatingInput
        name="selfRating"
        legend="How did it go?"
        labels={["", "Badly", "Weak", "Okay", "Well", "Great"]}
        defaultValue={interview?.selfRating}
        idPrefix="interview"
      />
      <Field id="interview-questions" label="Questions asked (Markdown)" optional>
        {md("interview-questions", "questionsMd", interview?.questionsMd ?? "")}
      </Field>
      <Field id="interview-answers" label="My answers (Markdown)" optional>
        {md("interview-answers", "myAnswersMd", interview?.myAnswersMd ?? "")}
      </Field>
      <Field id="interview-lessons" label="Lessons learned (Markdown)" optional>
        {md("interview-lessons", "lessonsMd", interview?.lessonsMd ?? "", 3)}
      </Field>
    </Shell>
  );
}

// ── Mock interview ──────────────────────────────────────────────────────────

export type MockDefaults = {
  id: string;
  dateKey: string;
  partner: string | null;
  type: InterviewRound;
  track: { id: string } | null;
  score: number | null;
  feedbackMd: string;
};

export function MockForm({
  mock,
  tracks,
  today,
  onDone,
}: {
  mock?: MockDefaults;
  tracks: TrackChoice[];
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveMockAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [type, setType] = useState<InterviewRound>(mock?.type ?? "TECHNICAL");
  const [trackId, setTrackId] = useState(mock?.track?.id ?? "");
  const err = state.fieldErrors;
  return (
    <Shell
      title={mock ? "Edit mock interview" : "Log or schedule a mock"}
      description="Pick a future date to schedule one; score it afterwards."
      state={state}
      pending={pending}
      onSubmit={onSubmit}
    >
      {mock && <input type="hidden" name="id" value={mock.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="trackId" value={trackId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="mock-date" label="Date" error={err?.date}>
          <Input
            id="mock-date"
            name="date"
            type="date"
            required
            defaultValue={mock?.dateKey ?? today}
            aria-invalid={Boolean(err?.date)}
          />
        </Field>
        <Field id="mock-type" label="Type">
          <EnumSelect
            id="mock-type"
            value={type}
            onChange={setType}
            options={ROUNDS}
            labels={ROUND_LABEL}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="mock-partner" label="Partner / platform" optional>
          <Input
            id="mock-partner"
            name="partner"
            maxLength={120}
            defaultValue={mock?.partner ?? ""}
            placeholder="Pramp, a friend, mentor…"
          />
        </Field>
        <TrackSelect tracks={tracks} value={trackId} onChange={setTrackId} />
      </div>
      <RatingInput
        name="score"
        legend="Score"
        labels={["", "Poor", "Weak", "Okay", "Good", "Excellent"]}
        defaultValue={mock?.score}
        idPrefix="mock"
      />
      {err?.score?.[0] && <p className="text-sm text-destructive">{err.score[0]}</p>}
      <Field id="mock-feedback" label="Feedback (Markdown)" optional>
        {md("mock-feedback", "feedbackMd", mock?.feedbackMd ?? "")}
      </Field>
    </Shell>
  );
}

// ── Organization ────────────────────────────────────────────────────────────

export type OrganizationDefaults = {
  id: string;
  name: string;
  type: OrganizationType;
  website: string | null;
  location: string | null;
  notesMd: string;
};

export function OrganizationForm({
  organization,
  onDone,
}: {
  organization: OrganizationDefaults;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveOrganizationAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [type, setType] = useState<OrganizationType>(organization.type);
  const err = state.fieldErrors;
  return (
    <Shell title="Edit organization" state={state} pending={pending} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={organization.id} />
      <input type="hidden" name="type" value={type} />
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field id="org-name" label="Name" error={err?.name}>
          <Input
            id="org-name"
            name="name"
            required
            maxLength={120}
            defaultValue={organization.name}
            aria-invalid={Boolean(err?.name)}
          />
        </Field>
        <Field id="org-type" label="Type">
          <EnumSelect
            id="org-type"
            value={type}
            onChange={setType}
            options={ORG_TYPES}
            labels={ORG_TYPE_LABEL}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="org-website" label="Website" optional error={err?.website}>
          <Input
            id="org-website"
            name="website"
            type="url"
            defaultValue={organization.website ?? ""}
          />
        </Field>
        <Field id="org-location" label="Location" optional>
          <Input
            id="org-location"
            name="location"
            maxLength={120}
            defaultValue={organization.location ?? ""}
          />
        </Field>
      </div>
      <Field id="org-notes" label="Notes (Markdown)" optional>
        {md("org-notes", "notesMd", organization.notesMd)}
      </Field>
    </Shell>
  );
}

// ── Delete ──────────────────────────────────────────────────────────────────

export function DeleteJobForm({
  kind,
  id,
  label,
  note,
  onDone,
}: {
  kind: "application" | "organization" | "interview" | "mock";
  id: string;
  label: string;
  note?: string;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(deleteJobRecordAction, onDone);
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
