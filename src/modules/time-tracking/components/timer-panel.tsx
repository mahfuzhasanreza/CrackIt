"use client";

import { LoaderCircle, Play, Square } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { initialActionState } from "@/lib/action-state";
import { startTimerAction, stopTimerAction } from "../actions";
import type { EntryOptions } from "../options";
import type { TimeEntryView } from "../service";

import { Elapsed } from "./elapsed";
import { FocusRating } from "./focus-rating";
import { useActionFeedback, useNoResetSubmit } from "./hooks";
import { RefPickers } from "./ref-pickers";

type Props = {
  running: TimeEntryView | null;
  options: EntryOptions;
  serverNow: Date;
  timezone: string;
};

export function TimerPanel({ running, options, serverNow, timezone }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <RunningCard running={running} serverNow={serverNow} timezone={timezone} />
      <QuickStart running={running} options={options} />
      <StartForm running={running} options={options} />
    </div>
  );
}

function RunningCard({ running, serverNow, timezone }: Omit<Props, "options">) {
  const [state, action, pending] = useActionState(stopTimerAction, initialActionState);
  useActionFeedback(state);
  const onSubmit = useNoResetSubmit(action);

  if (!running) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>No timer running</h2>
          </CardTitle>
          <CardDescription>
            Pick an activity below. Every minute you track shows up on your timeline.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const context = [running.track?.name, running.topic?.name].filter(Boolean).join(" › ");
  return (
    <Card className="border-l-4" style={{ borderLeftColor: running.activityType.color }}>
      <CardHeader>
        <CardDescription>Running since {formatTime(running.startedAt, timezone)}</CardDescription>
        <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl">{running.activityType.name}</h2>
          {context && <span className="text-sm font-normal text-muted-foreground">{context}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-5xl font-semibold tracking-tight" aria-live="off">
          <Elapsed since={running.startedAt} serverNow={serverNow} />
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FocusRating idPrefix="stop" defaultValue={running.focusRating} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="stop-note">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="stop-note"
              name="note"
              defaultValue={running.note ?? ""}
              placeholder="What did you get done?"
              rows={2}
            />
          </div>
          <Button type="submit" variant="destructive" disabled={pending} className="self-start">
            {pending ? <LoaderCircle className="animate-spin" /> : <Square />}
            Stop
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** One-tap start for non-study activities (sleep, breaks, meals, …). */
function QuickStart({ running, options }: Omit<Props, "serverNow" | "timezone">) {
  const [state, action, pending] = useActionState(startTimerAction, initialActionState);
  const [clicked, setClicked] = useState<string | null>(null);
  useActionFeedback(state);
  const quick = options.activities.filter((a) => a.category !== "STUDY");

  return (
    <section aria-labelledby="quick-start-heading" className="flex flex-col gap-3">
      <h2 id="quick-start-heading" className="text-sm font-medium text-muted-foreground">
        Quick switch
      </h2>
      <div className="flex flex-wrap gap-2">
        {quick.map((a) => {
          const active = running?.activityTypeId === a.id && !running.trackId;
          return (
            <form key={a.id} action={action} onSubmit={() => setClicked(a.id)}>
              <input type="hidden" name="activityTypeId" value={a.id} />
              <Button
                type="submit"
                variant={active ? "default" : "outline"}
                size="sm"
                disabled={pending || active}
                aria-pressed={active}
              >
                {pending && clicked === a.id ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <span className="size-2 rounded-full" style={{ backgroundColor: a.color }} />
                )}
                {a.name}
              </Button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

function StartForm({ running, options }: Omit<Props, "serverNow" | "timezone">) {
  const [state, action, pending] = useActionState(startTimerAction, initialActionState);
  const [formKey, setFormKey] = useState(0);
  useActionFeedback(state, () => setFormKey((k) => k + 1));
  const onSubmit = useNoResetSubmit(action);
  const study = options.activities.find((a) => a.category === "STUDY");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{running ? "Switch to…" : "Start studying"}</h2>
        </CardTitle>
        <CardDescription>
          Choose a track and topic so your hours add up per subject.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-4">
          <RefPickers
            idPrefix="start"
            options={options}
            defaults={{ activityTypeId: study?.id ?? "" }}
            fieldErrors={state.fieldErrors}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="start-note">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id="start-note" name="note" placeholder="Goal for this session" rows={2} />
          </div>
          <Button type="submit" disabled={pending} className={cn("self-start")}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Play />}
            {running ? "Switch" : "Start"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
