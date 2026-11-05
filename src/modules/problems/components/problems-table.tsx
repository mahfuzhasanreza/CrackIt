"use client";

import { Ellipsis, ExternalLink, NotebookText, Pencil, Timer, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { TrackOption } from "../../tracks-topics/repository";
import { DIFFICULTY_LABEL, PLATFORM_LABEL, STATUS_LABEL } from "../labels";
import type { ProblemView } from "../service";

import { AttemptForm, DeleteProblemForm, ProblemForm } from "./problem-dialogs";

type DialogState =
  | { kind: "edit"; problem: ProblemView }
  | { kind: "attempt"; problem: ProblemView }
  | { kind: "delete"; problem: ProblemView };

export function formatDay(key: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
}

/** Difficulty as 1–3 filled bars (no hue), plus the word. */
export function DifficultyLabel({ difficulty }: { difficulty: ProblemView["difficulty"] }) {
  const level = { EASY: 1, MEDIUM: 2, HARD: 3 }[difficulty];
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn("w-1 rounded-sm", n <= level ? "bg-foreground" : "bg-muted")}
            style={{ height: `${4 + n * 3}px` }}
          />
        ))}
      </span>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function ProblemsTable({
  problems,
  tracks,
  today,
}: {
  problems: ProblemView[];
  tracks: TrackOption[];
  today: string;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Problem
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Difficulty
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Patterns
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Attempts
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Time
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Next revision
              </th>
              <th scope="col" className="w-10 px-2 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {problems.map((p) => (
              <tr key={p.id} className="align-top hover:bg-muted/30">
                <th scope="row" className="px-3 py-2.5 text-left font-normal">
                  <div className="flex items-center gap-1.5">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {p.title}
                        <ExternalLink
                          className="ml-1 inline size-3 text-muted-foreground"
                          aria-hidden
                        />
                      </a>
                    ) : (
                      <span className="font-medium">{p.title}</span>
                    )}
                    {p.notesMd.trim() && (
                      <NotebookText
                        className="size-3.5 text-muted-foreground"
                        aria-label="Has notes"
                      />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {PLATFORM_LABEL[p.platform]}
                    {p.topic && <> · {p.topic.name}</>}
                  </div>
                </th>
                <td className="px-3 py-2.5">
                  <DifficultyLabel difficulty={p.difficulty} />
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={p.status === "NEEDS_REVISION" ? "default" : "outline"}>
                    {STATUS_LABEL[p.status]}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex max-w-56 flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{p.attempts}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {p.timeSpentMin ? formatDuration(p.timeSpentMin * 60_000) : "–"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {p.nextReviewOn ? (
                    <span className={cn(p.nextReviewOn <= today && "font-medium")}>
                      {p.nextReviewOn < today
                        ? `Overdue (${formatDay(p.nextReviewOn)})`
                        : p.nextReviewOn === today
                          ? "Today"
                          : formatDay(p.nextReviewOn)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Actions for ${p.title}`}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setDialog({ kind: "attempt", problem: p })}>
                        <Timer />
                        Log attempt
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", problem: p })}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDialog({ kind: "delete", problem: p })}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent
          className={cn(
            dialog?.kind === "edit" ? "max-h-[90dvh] overflow-y-auto sm:max-w-2xl" : "sm:max-w-md",
          )}
        >
          {dialog?.kind === "edit" && (
            <ProblemForm
              key={dialog.problem.id}
              problem={dialog.problem}
              tracks={tracks}
              onDone={close}
            />
          )}
          {dialog?.kind === "attempt" && <AttemptForm problem={dialog.problem} onDone={close} />}
          {dialog?.kind === "delete" && (
            <DeleteProblemForm problem={dialog.problem} onDone={close} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
