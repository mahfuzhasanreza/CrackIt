"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDuration, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { Interval, Segment } from "../day-summary";
import type { EntryOptions } from "../options";
import type { TimeEntryView } from "../service";

import { EntryDialog, type EntryDialogTarget } from "./entry-dialog";

type Props = {
  window: Interval;
  now: Date;
  entries: TimeEntryView[];
  segments: Segment[];
  gaps: Interval[];
  options: EntryOptions;
  timezone: string;
};

const HOUR = 3_600_000;
/** Pixel height of one hour on the timeline. */
const HOUR_PX = 48;

export function DayTimeline({ window, now, entries, segments, gaps, options, timezone }: Props) {
  const [target, setTarget] = useState<EntryDialogTarget | null>(null);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const span = window.end.getTime() - window.start.getTime();
  const pct = (d: Date) => ((d.getTime() - window.start.getTime()) / span) * 100;
  const hours = Math.round(span / HOUR);
  const nowInside = now > window.start && now < window.end;

  // Default "add" range: the last gap, else the last hour before now/day end.
  const addDefault = (): EntryDialogTarget => {
    const last = gaps.at(-1);
    if (last) return { mode: "add", start: last.start, end: last.end };
    const end = now < window.end ? now : window.end;
    return { mode: "add", start: new Date(end.getTime() - HOUR), end };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby="timeline-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="timeline-heading" className="text-sm font-medium text-muted-foreground">
            24-hour timeline
          </h2>
          <Button size="sm" onClick={() => setTarget(addDefault())}>
            <Plus />
            Add entry
          </Button>
        </div>
        <div className="relative rounded-lg border bg-card" style={{ height: hours * HOUR_PX }}>
          {Array.from({ length: hours + 1 }, (_, i) => {
            const at = new Date(window.start.getTime() + i * HOUR);
            return (
              <div
                key={i}
                className="pointer-events-none absolute inset-x-0 flex items-start border-t border-dashed border-border/70 first:border-t-0"
                style={{ top: `${pct(at)}%` }}
              >
                <span className="-translate-y-1/2 bg-card px-1.5 text-[11px] text-muted-foreground tabular-nums">
                  {i < hours ? formatTime(at, timezone) : ""}
                </span>
              </div>
            );
          })}

          {gaps.map((g) => (
            <button
              key={`gap-${g.start.toISOString()}`}
              type="button"
              onClick={() => setTarget({ mode: "add", start: g.start, end: g.end })}
              className="absolute right-2 left-14 flex items-center justify-center overflow-hidden rounded-md border border-dashed border-muted-foreground/40 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              style={{ top: `${pct(g.start)}%`, height: `${pct(g.end) - pct(g.start)}%` }}
              aria-label={`Untracked ${formatTime(g.start, timezone)}–${formatTime(g.end, timezone)}, add entry`}
            >
              {g.end.getTime() - g.start.getTime() >= 0.5 * HOUR &&
                `Untracked · ${formatDuration(g.end.getTime() - g.start.getTime())}`}
            </button>
          ))}

          {segments.map((s) => {
            const e = byId.get(s.entryId)!;
            const durationMs = s.end.getTime() - s.start.getTime();
            const tall = durationMs >= 0.75 * HOUR; // room for a second line
            return (
              <button
                key={s.entryId}
                type="button"
                onClick={() => setTarget({ mode: "edit", entry: e })}
                className={cn(
                  "absolute right-2 left-14 overflow-hidden rounded-md border-l-4 px-2 text-left text-xs hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring",
                  tall ? "py-1" : "flex items-center",
                  s.running && "animate-pulse",
                )}
                style={{
                  top: `${pct(s.start)}%`,
                  height: `max(${pct(s.end) - pct(s.start)}%, 3px)`,
                  borderLeftColor: e.activityType.color,
                  backgroundColor: `color-mix(in oklab, ${e.activityType.color} 18%, var(--card))`,
                }}
                aria-label={`${e.activityType.name} ${formatTime(s.start, timezone)}–${formatTime(s.end, timezone)}, edit`}
              >
                {durationMs >= 0.25 * HOUR && (
                  <span className="block truncate font-medium">
                    {e.activityType.name}
                    {e.topic ? ` · ${e.topic.name}` : e.track ? ` · ${e.track.name}` : ""}
                  </span>
                )}
                {tall && (
                  <span className="block truncate text-muted-foreground tabular-nums">
                    {formatTime(s.start, timezone)}–
                    {s.running ? "now" : formatTime(s.end, timezone)} · {formatDuration(durationMs)}
                  </span>
                )}
              </button>
            );
          })}

          {nowInside && (
            <div
              className="pointer-events-none absolute right-0 left-12 border-t-2 border-red-500"
              style={{ top: `${pct(now)}%` }}
            >
              <span className="absolute -top-1 -left-1 size-2 rounded-full bg-red-500" />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="entries-heading" className="flex flex-col gap-3">
        <h2 id="entries-heading" className="text-sm font-medium text-muted-foreground">
          Entries ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing tracked yet. Start the timer or click an untracked block to fill it in.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {entries.map((e) => {
              const end = e.endedAt ?? now;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setTarget({ mode: "edit", entry: e })}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
                  >
                    <span
                      className="mt-1.5 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: e.activityType.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {e.activityType.name}
                        {e.track && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {e.track.name}
                          </span>
                        )}
                      </span>
                      {(e.topic || e.note) && (
                        <span className="block truncate text-muted-foreground">
                          {[e.topic?.name, e.note].filter(Boolean).join(" — ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block">
                        {formatDuration(end.getTime() - e.startedAt.getTime())}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatTime(e.startedAt, timezone)}–
                        {e.endedAt ? formatTime(e.endedAt, timezone) : "now"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <EntryDialog
        target={target}
        onClose={() => setTarget(null)}
        options={options}
        timezone={timezone}
      />
    </div>
  );
}
