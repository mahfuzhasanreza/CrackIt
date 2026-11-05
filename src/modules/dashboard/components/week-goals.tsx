import { Check } from "lucide-react";

import { formatDuration } from "@/lib/dates";
import { darkOf, seriesVars } from "@/lib/palette";

import type { TrackOption } from "../../tracks-topics/repository";

/** One meter per track: hours this week against the weekly target. */
export function WeekGoals({
  byTrack,
  tracks,
}: {
  byTrack: Record<string, number>;
  tracks: TrackOption[];
}) {
  if (tracks.length === 0)
    return <p className="text-sm text-muted-foreground">No active tracks.</p>;
  return (
    <ul className="flex flex-col gap-5">
      {tracks.map((t) => {
        const done = byTrack[t.id] ?? 0;
        const target = (t.weeklyTargetMinutes ?? 0) * 60_000;
        const ratio = target ? done / target : 0;
        const pct = Math.round(ratio * 100);
        return (
          <li key={t.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground tabular-nums">
                <span className="font-medium text-foreground">{formatDuration(done)}</span>
                {target > 0 && (
                  <>
                    {" "}
                    / {formatDuration(target)} · {pct}%
                  </>
                )}
              </span>
            </div>
            {target > 0 ? (
              <div
                role="meter"
                aria-label={`${t.name} weekly goal`}
                aria-valuemin={0}
                aria-valuemax={target / 60_000}
                aria-valuenow={Math.round(done / 60_000)}
                aria-valuetext={`${formatDuration(done)} of ${formatDuration(target)}`}
                // Unfilled track: a light step of the same hue.
                className="h-2 overflow-hidden rounded-full"
                style={{
                  ...seriesVars(t.color, darkOf(t.color)),
                  backgroundColor: "color-mix(in oklab, var(--series) 18%, transparent)",
                }}
              >
                <div
                  className="h-full rounded-full bg-series"
                  style={{ width: `${Math.min(100, ratio * 100)}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No weekly target set.</p>
            )}
            {ratio >= 1 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="size-3.5" aria-hidden /> Goal met for this week
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
