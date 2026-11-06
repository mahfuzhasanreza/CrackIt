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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToastAction } from "@/hooks/use-toast-action";

import { formatDateKey } from "@/lib/dates";

import { reviewQuestionAction } from "../actions";
import { AUDIENCE_LABEL } from "../labels";
import type { PresentationView, QuestionView } from "../service";

import { DeleteForm, PresentationForm, QuestionForm, type TrackRef } from "./practice-forms";

const formatDay = (key: string) => formatDateKey(key, { year: "numeric" });

function TrackTag({ track }: { track: TrackRef | null }) {
  if (!track) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: track.color }} />
      {track.name}
    </span>
  );
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

// ── Presentations ───────────────────────────────────────────────────────────

export function PresentationsTab({
  demos,
  tracks,
  today,
}: {
  demos: PresentationView[];
  tracks: TrackRef[];
  today: string;
}) {
  const d = useDialog<PresentationView>();
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        text="Talks, demos, teaching sessions, pitches. Record yourself and score it honestly."
        action="Log presentation"
        onAdd={() => d.open({ mode: "add" })}
      />
      {demos.length === 0 ? (
        <Empty>No presentations yet. Log your first practice run.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {demos.map((demo) => (
            <li key={demo.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="font-medium">{demo.title}</h3>
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDay(demo.dateKey)}</span>
                    <span>{demo.durationMin} min</span>
                    <span>{AUDIENCE_LABEL[demo.audience]}</span>
                    <TrackTag track={demo.track} />
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
                    label={demo.title}
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
          {d.state?.mode === "add" && (
            <PresentationForm tracks={tracks} today={today} onDone={d.close} />
          )}
          {d.state?.mode === "edit" && (
            <PresentationForm
              key={d.state.item.id}
              demo={d.state.item}
              tracks={tracks}
              today={today}
              onDone={d.close}
            />
          )}
          {d.state?.mode === "delete" && (
            <DeleteForm
              kind="presentation"
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

export function QuestionsTab({
  questions,
  tracks,
  today,
}: {
  questions: QuestionView[];
  tracks: TrackRef[];
  today: string;
}) {
  const d = useDialog<QuestionView>();
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
        <Empty>
          No questions yet. Add the ones you expect to be asked — concepts, behavioural questions,
          viva or board questions — with a model answer.
        </Empty>
      ) : (
        <>
          <section aria-labelledby="questions-due" className="flex flex-col gap-3">
            <h3 id="questions-due" className="font-semibold">
              Practise today{" "}
              <span className="font-normal text-muted-foreground">({due.length})</span>
            </h3>
            {due.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {due.map((q) => (
                  <QuestionCard key={q.id} q={q} today={today} practise onDialog={d.open} />
                ))}
              </ul>
            )}
          </section>
          {rest.length > 0 && (
            <section aria-labelledby="questions-later" className="flex flex-col gap-3">
              <h3 id="questions-later" className="font-semibold">
                Later <span className="font-normal text-muted-foreground">({rest.length})</span>
              </h3>
              <ul className="flex flex-col gap-3">
                {rest.map((q) => (
                  <QuestionCard key={q.id} q={q} today={today} onDialog={d.open} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <Dialog open={d.state !== null} onOpenChange={(o) => !o && d.close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {d.state?.mode === "add" && <QuestionForm tracks={tracks} onDone={d.close} />}
          {d.state?.mode === "edit" && (
            <QuestionForm
              key={d.state.item.id}
              question={d.state.item}
              tracks={tracks}
              onDone={d.close}
            />
          )}
          {d.state?.mode === "delete" && (
            <DeleteForm
              kind="question"
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

function QuestionCard({
  q,
  today,
  practise = false,
  onDialog,
}: {
  q: QuestionView;
  today: string;
  practise?: boolean;
  onDialog: (s: { mode: "edit" | "delete"; item: QuestionView }) => void;
}) {
  const [shown, setShown] = useState(false);
  const [, action, pending] = useToastAction(reviewQuestionAction);
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
            <TrackTag track={q.track} />
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
