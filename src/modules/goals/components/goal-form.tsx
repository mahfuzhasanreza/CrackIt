"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { FormField } from "@/components/form-field";
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
import type { GoalMetric, GoalPeriod } from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import { deleteGoalAction, saveGoalAction } from "../actions";
import { GOAL_METRICS, GOAL_PERIODS } from "../validators";

export type TrackChoice = { id: string; name: string; color: string };
export type EditableGoal = {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  startsOn: string;
  endsOn: string | null;
  track: { id: string } | null;
};

export const METRIC_LABEL: Record<GoalMetric, string> = {
  STUDY_MINUTES: "Study time",
  PROBLEMS_SOLVED: "Problems solved",
  LEARNING_ENTRIES: "Learning notes",
};
export const PERIOD_LABEL: Record<GoalPeriod, string> = {
  DAY: "Per day",
  WEEK: "Per week",
  MONTH: "Per month",
};

const NONE = "none";

export function GoalForm({
  goal,
  tracks,
  today,
  onDone,
}: {
  goal?: EditableGoal;
  tracks: TrackChoice[];
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveGoalAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? "STUDY_MINUTES");
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "WEEK");
  const [trackId, setTrackId] = useState(goal?.track?.id ?? "");
  const err = state.fieldErrors;
  const study = metric === "STUDY_MINUTES";
  const target = goal
    ? goal.metric === "STUDY_MINUTES"
      ? String(Math.round((goal.target / 60) * 100) / 100)
      : String(goal.target)
    : "";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{goal ? "Edit goal" : "Add goal"}</DialogTitle>
        <DialogDescription>Analytics compares each period against the target.</DialogDescription>
      </DialogHeader>
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <input type="hidden" name="metric" value={metric} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="trackId" value={study ? trackId : ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="goal-metric" label="Measure">
          <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
            <SelectTrigger id="goal-metric" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_METRICS.map((m) => (
                <SelectItem key={m} value={m}>
                  {METRIC_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="goal-period" label="Period">
          <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
            <SelectTrigger id="goal-period" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="goal-target" label={study ? "Target (hours)" : "Target"} error={err?.target}>
          <Input
            id="goal-target"
            name="target"
            type="number"
            inputMode="decimal"
            min={study ? 0.25 : 1}
            step={study ? 0.25 : 1}
            required
            defaultValue={target}
            aria-invalid={Boolean(err?.target)}
          />
        </FormField>
        {study && (
          <FormField id="goal-track" label="Track" optional>
            <Select value={trackId || NONE} onValueChange={(v) => setTrackId(v === NONE ? "" : v)}>
              <SelectTrigger id="goal-track" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All study</SelectItem>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="goal-starts" label="Starts" error={err?.startsOn}>
          <Input
            id="goal-starts"
            name="startsOn"
            type="date"
            required
            defaultValue={goal?.startsOn ?? today}
          />
        </FormField>
        <FormField id="goal-ends" label="Ends" optional error={err?.endsOn}>
          <Input id="goal-ends" name="endsOn" type="date" defaultValue={goal?.endsOn ?? ""} />
        </FormField>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteGoal({
  goal,
  title,
  onDone,
}: {
  goal: { id: string };
  title: string;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(deleteGoalAction, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete “{title}”?</DialogTitle>
        <DialogDescription>
          Your logged time and problems stay; only the goal goes.
        </DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={goal.id} />
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
