"use client";

import { ChevronDown, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { OUTCOME_LABEL, ROUND_LABEL } from "../labels";

import { DeleteJobForm, InterviewForm, type InterviewDefaults } from "./job-forms";

export type InterviewItem = InterviewDefaults & {
  application?: { id: string; role: string; organization: { name: string } };
};
type AppOption = { id: string; role: string; organization: { name: string } };

export function formatWhen(d: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

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
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        disabled={!applicationId && !applications?.length}
        title={!applicationId && !applications?.length ? "Add an application first" : undefined}
      >
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

/** Interviews with expandable questions / answers / lessons. */
export function InterviewList({
  interviews,
  timezone,
  showApplication = true,
  empty,
}: {
  interviews: InterviewItem[];
  timezone: string;
  showApplication?: boolean;
  empty: string;
}) {
  const [dialog, setDialog] = useState<{ kind: "edit" | "delete"; item: InterviewItem } | null>(
    null,
  );
  if (interviews.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <>
      <ul className="flex flex-col gap-3">
        {interviews.map((i) => (
          <InterviewCard
            key={i.id}
            interview={i}
            timezone={timezone}
            showApplication={showApplication}
            onEdit={() => setDialog({ kind: "edit", item: i })}
            onDelete={() => setDialog({ kind: "delete", item: i })}
          />
        ))}
      </ul>
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
  showApplication,
  onEdit,
  onDelete,
}: {
  interview: InterviewItem;
  timezone: string;
  showApplication: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sections = [
    { title: "Questions asked", body: i.questionsMd },
    { title: "My answers", body: i.myAnswersMd },
    { title: "Lessons learned", body: i.lessonsMd },
  ].filter((s) => s.body.trim());
  const label = `${ROUND_LABEL[i.round]}${i.application ? ` · ${i.application.organization.name}` : ""}`;

  return (
    <li className="rounded-xl border bg-card p-4" aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{ROUND_LABEL[i.round]}</h3>
            <Badge variant={i.outcome === "PASSED" ? "default" : "outline"}>
              {OUTCOME_LABEL[i.outcome]}
            </Badge>
            {i.selfRating && (
              <span className="text-xs text-muted-foreground">Felt {i.selfRating}/5</span>
            )}
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={i.scheduledAt.toISOString()}>
              {formatWhen(i.scheduledAt, timezone)}
            </time>
            {i.durationMin && <span>{i.durationMin} min</span>}
            {i.interviewer && <span>with {i.interviewer}</span>}
            {showApplication && i.application && (
              <Link
                href={`/applications/${i.application.id}`}
                className="hover:text-foreground hover:underline"
              >
                {i.application.role} · {i.application.organization.name}
              </Link>
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
      {sections.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 -ml-2"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
            {open ? "Hide notes" : "Show notes"}
          </Button>
          {open && (
            <div className="mt-2 flex flex-col gap-3">
              {sections.map((s) => (
                <section key={s.title}>
                  <h4 className="mb-1 text-sm font-medium">{s.title}</h4>
                  <Markdown>{s.body}</Markdown>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </li>
  );
}
