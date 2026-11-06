"use client";

import { Ban, Check, Ellipsis, NotebookText, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InterviewOutcome } from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";
import { toDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { setInterviewOutcomeAction } from "../actions";
import { OUTCOME_BADGE, OUTCOME_LABEL, ROUND_LABEL } from "../labels";
import { dayHeading, formatTimeOfDay, formatWhen } from "../format";
import { relativeTime } from "../rules";

import { DeleteJobForm, InterviewForm, type InterviewDefaults } from "./job-forms";

export type InterviewItem = InterviewDefaults & {
  application?: { id: string; role: string; organization: { name: string } };
};
type AppOption = { id: string; role: string; organization: { name: string } };

/** Add-interview button + dialog. With `applicationId`, the application is fixed. */
export function AddInterviewButton({
  applicationId,
  applications,
  timezone,
  variant = "default",
}: {
  applicationId?: string;
  applications?: AppOption[];
  timezone: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus />
        Add interview
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {open && (
            <InterviewForm
              applicationId={applicationId}
              applications={applications}
              timezone={timezone}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Passed / Didn't pass / Cancelled in one click. */
export function OutcomeButtons({
  id,
  label,
  size = "sm",
  onlyCancel = false,
}: {
  id: string;
  label: string;
  size?: "sm" | "default";
  /** Before the interview: it can only be cancelled. */
  onlyCancel?: boolean;
}) {
  const [, action, pending] = useToastAction(setInterviewOutcomeAction);
  const set = (outcome: InterviewOutcome) => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("outcome", outcome);
    startTransition(() => action(fd));
  };
  return (
    <div role="group" aria-label={`Outcome of ${label}`} className="flex flex-wrap gap-2">
      {!onlyCancel && (
        <>
          <Button size={size} disabled={pending} onClick={() => set("PASSED")}>
            <Check />
            Passed
          </Button>
          <Button size={size} variant="outline" disabled={pending} onClick={() => set("FAILED")}>
            <X />
            Didn&apos;t pass
          </Button>
        </>
      )}
      <Button size={size} variant="ghost" disabled={pending} onClick={() => set("CANCELLED")}>
        <Ban />
        {onlyCancel ? "Mark cancelled" : "Cancelled"}
      </Button>
    </div>
  );
}

/**
 * Interviews as cards. `variant` changes what each card offers: upcoming shows "in 2 days"
 * and groups by day; needs-outcome shows the outcome buttons; past is a plain history.
 */
export function InterviewList({
  interviews,
  timezone,
  now,
  variant = "past",
  showApplication = true,
  empty,
}: {
  interviews: (InterviewItem & { dayKey?: string })[];
  timezone: string;
  now?: Date;
  variant?: "upcoming" | "needsOutcome" | "past";
  showApplication?: boolean;
  empty: string;
}) {
  const [dialog, setDialog] = useState<{ kind: "edit" | "delete"; item: InterviewItem } | null>(
    null,
  );
  if (interviews.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  const card = (i: InterviewItem) => (
    <InterviewCard
      key={i.id}
      interview={i}
      timezone={timezone}
      now={now}
      variant={variant}
      showApplication={showApplication}
      onEdit={() => setDialog({ kind: "edit", item: i })}
      onDelete={() => setDialog({ kind: "delete", item: i })}
    />
  );

  let body: React.ReactNode;
  if (variant === "upcoming") {
    const today = toDateKey(now ?? new Date(), timezone);
    const days = new Map<string, InterviewItem[]>();
    for (const i of interviews) {
      const key = i.dayKey ?? toDateKey(i.scheduledAt, timezone);
      days.set(key, [...(days.get(key) ?? []), i]);
    }
    body = (
      <div className="flex flex-col gap-5">
        {[...days].map(([key, items]) => (
          <section key={key} aria-label={dayHeading(key, today)} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{dayHeading(key, today)}</h3>
            <ul className="flex flex-col gap-3">{items.map(card)}</ul>
          </section>
        ))}
      </div>
    );
  } else {
    body = <ul className="flex flex-col gap-3">{interviews.map(card)}</ul>;
  }

  return (
    <>
      {body}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {dialog?.kind === "edit" && (
            <InterviewForm
              key={dialog.item.id}
              interview={dialog.item}
              timezone={timezone}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog?.kind === "delete" && (
            <DeleteJobForm
              kind="interview"
              id={dialog.item.id}
              label={`${ROUND_LABEL[dialog.item.round]} interview`}
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InterviewCard({
  interview: i,
  timezone,
  now,
  variant,
  showApplication,
  onEdit,
  onDelete,
}: {
  interview: InterviewItem;
  timezone: string;
  now?: Date;
  variant: "upcoming" | "needsOutcome" | "past";
  showApplication: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label = `${ROUND_LABEL[i.round]}${i.application ? ` · ${i.application.organization.name}` : ""}`;
  const notes = [i.questionsMd, i.myAnswersMd, i.lessonsMd].filter((s) => s.trim()).length;
  const when =
    variant === "upcoming"
      ? formatTimeOfDay(i.scheduledAt, timezone)
      : formatWhen(i.scheduledAt, timezone);

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-4",
        variant === "needsOutcome" && "border-dashed",
        i.outcome === "CANCELLED" && "opacity-70",
      )}
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">
              <Link href={`/interviews/${i.id}`} className="hover:underline">
                {ROUND_LABEL[i.round]}
                {i.application && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {i.application.organization.name}
                  </span>
                )}
              </Link>
            </h3>
            {variant !== "upcoming" && (
              <Badge variant={OUTCOME_BADGE[i.outcome]}>{OUTCOME_LABEL[i.outcome]}</Badge>
            )}
            {i.selfRating && (
              <span className="text-xs text-muted-foreground">Felt {i.selfRating}/5</span>
            )}
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={i.scheduledAt.toISOString()}>{when}</time>
            {now && variant !== "past" && <span>{relativeTime(i.scheduledAt, now)}</span>}
            {i.durationMin && <span>{i.durationMin} min</span>}
            {i.interviewer && <span>with {i.interviewer}</span>}
            {showApplication && i.application && (
              <Link
                href={`/applications/${i.application.id}`}
                className="hover:text-foreground hover:underline"
              >
                {i.application.role}
              </Link>
            )}
            {notes > 0 && (
              <span className="flex items-center gap-1">
                <NotebookText className="size-3.5" aria-hidden />
                Notes
              </span>
            )}
          </p>
        </div>
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
            <DropdownMenuItem asChild>
              <Link href={`/interviews/${i.id}`}>
                <NotebookText />
                Open
              </Link>
            </DropdownMenuItem>
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
      </div>
      {variant === "needsOutcome" && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm">How did it go?</p>
          <OutcomeButtons id={i.id} label={label} />
        </div>
      )}
    </li>
  );
}
