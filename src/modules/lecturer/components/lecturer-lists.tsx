"use client";

import {
  Check,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
import { ProgressMeter } from "@/components/progress-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToastAction } from "@/hooks/use-toast-action";

import { practiseVivaAction } from "../actions";
import { AUDIENCE_LABEL, PUBLICATION_STATUS_LABEL } from "../labels";
import type { CourseView, DemoView, PublicationView, VivaView } from "../service";

import { CourseForm, DeleteForm, DemoForm, PublicationForm, VivaForm } from "./lecturer-forms";

type CourseRef = { id: string; name: string; code: string | null };

export function formatDay(key: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
}

/** Dialog state shared by every tab: nothing, a form (add/edit) or a delete confirmation. */
function useDialog<T>() {
  const [state, setState] = useState<{ mode: "add" } | { mode: "edit" | "delete"; item: T } | null>(
    null,
  );
  return { state, open: setState, close: () => setState(null) };
}

function ItemMenu({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={`Actions for ${label}`}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SectionHeader({
  text,
  action,
  onAdd,
}: {
  text: string;
  action: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button onClick={onAdd}>
        <Plus />
        {action}
      </Button>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
    {children}
  </p>
);

const ExtLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
  >
    {children}
    <ExternalLink className="size-3" aria-hidden />
  </a>
);

// ── Demos ───────────────────────────────────────────────────────────────────

export function DemosTab({
  demos,
  courses,
  today,
}: {
  demos: DemoView[];
  courses: CourseRef[];
  today: string;
}) {
  const d = useDialog<DemoView>();
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        text="Practise often; record yourself and score it honestly."
        action="Log demo"
        onAdd={() => d.open({ mode: "add" })}
      />
      {demos.length === 0 ? (
        <Empty>No demos yet. Log your first practice session.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {demos.map((demo) => (
            <li key={demo.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="font-medium">{demo.topic}</h3>
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDay(demo.dateKey)}</span>
                    <span>{demo.durationMin} min</span>
                    <span>{AUDIENCE_LABEL[demo.audience]}</span>
                    {demo.course && <span>{demo.course.name}</span>}
                    {demo.recordingUrl && <ExtLink href={demo.recordingUrl}>Recording</ExtLink>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {demo.selfScore && (
                    <span
                      className="text-sm tabular-nums"
                      aria-label={`Self-score ${demo.selfScore} of 5`}
                    >
                      <span className="text-lg font-semibold">{demo.selfScore}</span>
                      <span className="text-muted-foreground">/5</span>
                    </span>
                  )}
                  <ItemMenu
                    label={demo.topic}
                    onEdit={() => d.open({ mode: "edit", item: demo })}
                    onDelete={() => d.open({ mode: "delete", item: demo })}
                  />
                </div>
              </div>
              {demo.feedbackMd.trim() && <Markdown className="mt-3">{demo.feedbackMd}</Markdown>}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={d.state !== null} onOpenChange={(o) => !o && d.close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {d.state?.mode === "add" && <DemoForm courses={courses} today={today} onDone={d.close} />}
          {d.state?.mode === "edit" && (
            <DemoForm
              key={d.state.item.id}
              demo={d.state.item}
              courses={courses}
              today={today}
              onDone={d.close}
            />
          )}
          {d.state?.mode === "delete" && (
            <DeleteForm
              kind="demo"
              id={d.state.item.id}
              label={d.state.item.topic}
              onDone={d.close}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Courses ─────────────────────────────────────────────────────────────────

export function CoursesTab({ courses }: { courses: CourseView[] }) {
  const d = useDialog<CourseView>();
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        text="Subjects you may teach, least ready first."
        action="Add course"
        onAdd={() => d.open({ mode: "add" })}
      />
      {courses.length === 0 ? (
        <Empty>No courses yet. Add the subjects in the job circular.</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">
                    {c.code && <span className="text-muted-foreground">{c.code} · </span>}
                    {c.name}
                  </h3>
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>
                      {c.demoCount} demo{c.demoCount === 1 ? "" : "s"}
                    </span>
                    <span>
                      {c.vivaCount} viva question{c.vivaCount === 1 ? "" : "s"}
                    </span>
                    {c.syllabusUrl && <ExtLink href={c.syllabusUrl}>Syllabus</ExtLink>}
                  </p>
                </div>
                <ItemMenu
                  label={c.name}
                  onEdit={() => d.open({ mode: "edit", item: c })}
                  onDelete={() => d.open({ mode: "delete", item: c })}
                />
              </div>
              <div className="flex items-center gap-3">
                <ProgressMeter
                  value={c.readiness / 5}
                  label={`${c.name} readiness`}
                  valueText={`${c.readiness} of 5`}
                />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  Readiness {c.readiness}/5
                </span>
              </div>
              {c.notesMd.trim() && <Markdown>{c.notesMd}</Markdown>}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={d.state !== null} onOpenChange={(o) => !o && d.close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {d.state?.mode === "add" && <CourseForm onDone={d.close} />}
          {d.state?.mode === "edit" && (
            <CourseForm key={d.state.item.id} course={d.state.item} onDone={d.close} />
          )}
          {d.state?.mode === "delete" && (
            <DeleteForm
              kind="course"
              id={d.state.item.id}
              label={d.state.item.name}
              note="Its demos and viva questions are kept, just no longer linked to it."
              onDone={d.close}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Publications ────────────────────────────────────────────────────────────

export function PublicationsTab({
  publications,
  today,
}: {
  publications: PublicationView[];
  today: string;
}) {
  const d = useDialog<PublicationView>();
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        text="Papers from idea to publication."
        action="Add publication"
        onAdd={() => d.open({ mode: "add" })}
      />
      {publications.length === 0 ? (
        <Empty>No publications yet.</Empty>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {publications.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-medium">{p.title}</h3>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge
                    variant={
                      p.status === "PUBLISHED" || p.status === "ACCEPTED" ? "default" : "outline"
                    }
                  >
                    {PUBLICATION_STATUS_LABEL[p.status]}
                  </Badge>
                  {p.venue && <span>{p.venue}</span>}
                  {p.submittedOn && <span>Submitted {formatDay(p.submittedOn)}</span>}
                  {p.url && <ExtLink href={p.url}>Link</ExtLink>}
                </p>
                {p.notesMd.trim() && <Markdown className="mt-2">{p.notesMd}</Markdown>}
              </div>
              <ItemMenu
                label={p.title}
                onEdit={() => d.open({ mode: "edit", item: p })}
                onDelete={() => d.open({ mode: "delete", item: p })}
              />
            </li>
          ))}
        </ul>
      )}
      <Dialog open={d.state !== null} onOpenChange={(o) => !o && d.close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {d.state?.mode === "add" && <PublicationForm today={today} onDone={d.close} />}
          {d.state?.mode === "edit" && (
            <PublicationForm
              key={d.state.item.id}
              publication={d.state.item}
              today={today}
              onDone={d.close}
            />
          )}
          {d.state?.mode === "delete" && (
            <DeleteForm
              kind="publication"
              id={d.state.item.id}
              label={d.state.item.title}
              onDone={d.close}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Viva bank ───────────────────────────────────────────────────────────────

export function VivaTab({
  questions,
  courses,
  today,
}: {
  questions: VivaView[];
  courses: CourseRef[];
  today: string;
}) {
  const d = useDialog<VivaView>();
  const due = questions.filter((q) => q.nextReviewOn !== null && q.nextReviewOn <= today);
  const rest = questions.filter((q) => !due.includes(q));
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        text="Answer out loud first, then reveal the model answer."
        action="Add question"
        onAdd={() => d.open({ mode: "add" })}
      />
      {questions.length === 0 ? (
        <Empty>No questions yet. Add ones you expect from the board.</Empty>
      ) : (
        <>
          <section aria-labelledby="viva-due" className="flex flex-col gap-3">
            <h3 id="viva-due" className="font-semibold">
              Practise today{" "}
              <span className="font-normal text-muted-foreground">({due.length})</span>
            </h3>
            {due.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {due.map((q) => (
                  <VivaCard key={q.id} q={q} today={today} practise onDialog={d.open} />
                ))}
              </ul>
            )}
          </section>
          {rest.length > 0 && (
            <section aria-labelledby="viva-all" className="flex flex-col gap-3">
              <h3 id="viva-all" className="font-semibold">
                Later <span className="font-normal text-muted-foreground">({rest.length})</span>
              </h3>
              <ul className="flex flex-col gap-3">
                {rest.map((q) => (
                  <VivaCard key={q.id} q={q} today={today} onDialog={d.open} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <Dialog open={d.state !== null} onOpenChange={(o) => !o && d.close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {d.state?.mode === "add" && <VivaForm courses={courses} onDone={d.close} />}
          {d.state?.mode === "edit" && (
            <VivaForm
              key={d.state.item.id}
              question={d.state.item}
              courses={courses}
              onDone={d.close}
            />
          )}
          {d.state?.mode === "delete" && (
            <DeleteForm
              kind="viva"
              id={d.state.item.id}
              label={d.state.item.question.slice(0, 60)}
              onDone={d.close}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VivaCard({
  q,
  today,
  practise = false,
  onDialog,
}: {
  q: VivaView;
  today: string;
  practise?: boolean;
  onDialog: (s: { mode: "edit" | "delete"; item: VivaView }) => void;
}) {
  const [shown, setShown] = useState(false);
  const [, action, pending] = useToastAction(practiseVivaAction);
  const [, startTransition] = useTransition();
  const answer = (outcome: "remembered" | "forgot") =>
    startTransition(() => {
      const fd = new FormData();
      fd.set("id", q.id);
      fd.set("outcome", outcome);
      action(fd);
    });

  return (
    <li className="rounded-xl border bg-card p-4" aria-label={q.question}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium whitespace-pre-line">{q.question}</p>
          <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {q.course && <span>{q.course.name}</span>}
            <span>
              {q.nextReviewOn === null
                ? "Mastered"
                : q.nextReviewOn < today
                  ? `Overdue since ${formatDay(q.nextReviewOn)}`
                  : q.nextReviewOn === today
                    ? "Due today"
                    : `Next ${formatDay(q.nextReviewOn)}`}
            </span>
          </p>
        </div>
        <ItemMenu
          label={q.question.slice(0, 60)}
          onEdit={() => onDialog({ mode: "edit", item: q })}
          onDelete={() => onDialog({ mode: "delete", item: q })}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShown((s) => !s)}
          aria-expanded={shown}
        >
          {shown ? <EyeOff /> : <Eye />}
          {shown ? "Hide answer" : "Show answer"}
        </Button>
        {practise && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => answer("remembered")}
            >
              <Check />
              Remembered
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => answer("forgot")}>
              <RotateCcw />
              Forgot
            </Button>
          </>
        )}
      </div>
      {shown && (
        <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
          {q.answerMd.trim() ? (
            <Markdown>{q.answerMd}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">No model answer yet.</p>
          )}
        </div>
      )}
    </li>
  );
}
