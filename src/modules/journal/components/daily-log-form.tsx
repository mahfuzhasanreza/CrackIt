"use client";

import { LoaderCircle } from "lucide-react";

import { RatingInput } from "@/components/rating-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/dates";

import { useToastAction } from "@/hooks/use-toast-action";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import { saveDailyLogAction } from "../actions";
import type { DailyLogView } from "../service";

const MOOD = ["", "Awful", "Low", "Okay", "Good", "Great"];
const ENERGY = ["", "Drained", "Tired", "Okay", "Energetic", "Fired up"];
const SLEEP = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];

const TEXT_FIELDS = [
  { name: "planForDay", label: "Plan for the day", placeholder: "Top 3 things to get done…" },
  { name: "wins", label: "Wins", placeholder: "What went well?" },
  { name: "blockers", label: "Blockers", placeholder: "What got in the way?" },
  { name: "reflection", label: "Reflection", placeholder: "How did the day go overall?" },
] as const;

export function DailyLogForm({
  dateKey,
  log,
  timezone,
}: {
  dateKey: string;
  log: DailyLogView | null;
  timezone: string;
}) {
  const [state, action, pending] = useToastAction(saveDailyLogAction);
  const onSubmit = useNoResetSubmit(action);
  const err = state.fieldErrors;

  return (
    // Remount when the day changes so defaults reload.
    <form key={dateKey} onSubmit={onSubmit} className="flex flex-col gap-6" aria-label="Daily log">
      <input type="hidden" name="date" value={dateKey} />

      <div className="flex flex-wrap gap-x-10 gap-y-6">
        <RatingInput
          name="mood"
          legend="Mood"
          labels={MOOD}
          defaultValue={log?.mood}
          idPrefix="log"
        />
        <RatingInput
          name="energy"
          legend="Energy"
          labels={ENERGY}
          defaultValue={log?.energy}
          idPrefix="log"
        />
        <RatingInput
          name="sleepQuality"
          legend="Sleep quality"
          labels={SLEEP}
          defaultValue={log?.sleepQuality}
          idPrefix="log"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-bed">Went to bed (last night)</Label>
          <Input
            id="log-bed"
            name="bedTime"
            type="time"
            defaultValue={log?.bedTime ?? ""}
            aria-invalid={Boolean(err?.bedTime)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-wake">Woke up</Label>
          <Input
            id="log-wake"
            name="wakeTime"
            type="time"
            defaultValue={log?.wakeTime ?? ""}
            aria-invalid={Boolean(err?.wakeTime)}
            aria-describedby={err?.wakeTime ? "log-wake-error" : undefined}
          />
        </div>
        <p className="text-sm text-muted-foreground sm:pb-2">
          {log?.sleepMs ? (
            <>
              Slept{" "}
              <span className="font-medium text-foreground">{formatDuration(log.sleepMs)}</span>
            </>
          ) : (
            "Bedtime after noon counts as the night before."
          )}
        </p>
        {(err?.wakeTime ?? err?.bedTime) && (
          <p id="log-wake-error" className="text-sm text-destructive sm:col-span-3">
            {(err?.wakeTime ?? err?.bedTime)?.[0]}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.name} className="flex flex-col gap-2">
            <Label htmlFor={`log-${f.name}`}>{f.label}</Label>
            <Textarea
              id={`log-${f.name}`}
              name={f.name}
              rows={3}
              placeholder={f.placeholder}
              defaultValue={log?.[f.name] ?? ""}
              aria-invalid={Boolean(err?.[f.name])}
            />
            {err?.[f.name] && <p className="text-sm text-destructive">{err[f.name]![0]}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {log
            ? `Last saved ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(log.updatedAt)}`
            : "Not saved yet"}
        </p>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save journal
        </Button>
      </div>
    </form>
  );
}
