"use client";

import { Ellipsis, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateKey } from "@/lib/dates";
import { ACCENT, seriesVars } from "@/lib/palette";
import { cn } from "@/lib/utils";

import type { GoalProgress } from "../../analytics/service";
import { CURRENT, formatGoalActual, formatGoalAmount, goalTitle } from "../labels";

import { DeleteGoal, GoalForm, type TrackChoice } from "./goal-form";

type DialogState = { kind: "add" } | { kind: "edit" | "delete"; goal: GoalProgress };

/** Goals vs actual: the current period as a meter, recent periods as columns against the target. */
export function GoalsPanel({
  goals,
  tracks,
  today,
}: {
  goals: GoalProgress[];
  tracks: TrackChoice[];
  today: string;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const close = () => setDialog(null);

  return (
    <section aria-labelledby="goals-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="goals-heading" className="text-lg font-semibold tracking-tight">
            Goals vs actual
          </h2>
          <p className="text-sm text-muted-foreground">
            Targets for study time, problems or learning notes, per day, week or month.
          </p>
        </div>
        <Button variant="outline" onClick={() => setDialog({ kind: "add" })}>
          <Plus />
          Add goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          <Target className="size-4" aria-hidden />
          No goals yet. Add one, e.g. 10h of study a week.
        </p>
      ) : (
        <ul className="grid items-start gap-4 lg:grid-cols-2">
          {goals.map((g) => (
            <li key={g.id}>
              <GoalCard goal={g} open={(kind) => setDialog({ kind, goal: g })} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          {dialog?.kind === "add" && <GoalForm tracks={tracks} today={today} onDone={close} />}
          {dialog?.kind === "edit" && (
            <GoalForm
              key={dialog.goal.id}
              goal={dialog.goal}
              tracks={tracks}
              today={today}
              onDone={close}
            />
          )}
          {dialog?.kind === "delete" && (
            <DeleteGoal goal={dialog.goal} title={goalTitle(dialog.goal)} onDone={close} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function periodLabel(g: GoalProgress, p: GoalProgress["periods"][number]) {
  if (g.period === "DAY") return formatDateKey(p.start, { weekday: "short" });
  if (g.period === "MONTH") return formatDateKey(p.start, { day: undefined, month: "short" });
  return `Week of ${formatDateKey(p.start)}`;
}

function GoalCard({
  goal: g,
  open,
}: {
  goal: GoalProgress;
  open: (kind: "edit" | "delete") => void;
}) {
  const title = goalTitle(g);
  const headingId = `goal-${g.id}`;
  const current = g.periods.find((p) => p.current);
  const finished = g.periods.filter((p) => !p.current);
  const hits = finished.filter((p) => p.met).length;
  const top = Math.max(g.target, ...g.periods.map((p) => p.actual)) || 1;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={headingId} className="font-medium">
            {title}
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {g.ended ? (
              <Badge variant="outline">Ended {formatDateKey(g.endsOn!)}</Badge>
            ) : g.upcoming ? (
              <Badge variant="outline">Starts {formatDateKey(g.startsOn)}</Badge>
            ) : null}
            {finished.length > 0 && (
              <span>
                Hit {hits} of the last {finished.length}
              </span>
            )}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Actions for ${title}`}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => open("edit")}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => open("delete")}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {current && (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-baseline justify-between gap-2 text-sm">
            <span>{CURRENT[g.period]}</span>
            <span className="text-muted-foreground tabular-nums">
              <span className="font-medium text-foreground">
                {formatGoalActual(g.metric, current.actual)}
              </span>{" "}
              of {formatGoalAmount(g.metric, g.target)}
            </span>
          </p>
          <ProgressMeter
            value={current.actual / g.target}
            label={`${title}: ${CURRENT[g.period].toLowerCase()}`}
            valueText={`${formatGoalActual(g.metric, current.actual)} of ${formatGoalAmount(g.metric, g.target)}`}
          />
        </div>
      )}

      {g.periods.length > 1 && (
        <figure className="flex flex-col gap-1.5">
          <figcaption className="text-xs text-muted-foreground">
            Recent periods · line = target · filled = hit
          </figcaption>
          <div className="relative h-16">
            <div
              aria-hidden
              className="absolute inset-x-0 border-t border-foreground/50"
              style={{ bottom: `${(g.target / top) * 100}%` }}
            />
            <div
              className="absolute inset-0 grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${g.periods.length}, minmax(0, 1fr))` }}
            >
              {g.periods.map((p) => (
                <Tooltip key={p.start}>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      aria-label={`${periodLabel(g, p)}: ${formatGoalAmount(g.metric, p.actual)}, ${p.met ? "hit" : p.current ? "in progress" : "missed"}`}
                      className="flex h-full items-end justify-center rounded-sm outline-offset-1 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <div
                        className={cn(
                          "w-full max-w-4 rounded-t-[3px]",
                          p.met ? "bg-series" : "bg-muted-foreground/35",
                          p.current && !p.met && "bg-muted-foreground/20",
                        )}
                        style={{
                          ...(p.met ? seriesVars(ACCENT.light, ACCENT.dark) : {}),
                          height: p.actual > 0 ? `max(2px, ${(p.actual / top) * 100}%)` : 0,
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{periodLabel(g, p)}</p>
                    <p>
                      <span className="font-semibold tabular-nums">
                        {formatGoalAmount(g.metric, p.actual)}
                      </span>{" "}
                      <span className="opacity-80">
                        {p.met ? "· hit" : p.current ? "· in progress" : "· missed"}
                      </span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </figure>
      )}
    </article>
  );
}
