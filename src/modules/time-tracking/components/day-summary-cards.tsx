import { formatDuration } from "@/lib/dates";

import type { DaySummary } from "../day-summary";
import type { TrackOption } from "../options";

export function DaySummaryCards({
  summary,
  tracks,
}: {
  summary: DaySummary;
  tracks: TrackOption[];
}) {
  const c = summary.byCategory;
  const study = c.STUDY ?? 0;
  const sleep = c.SLEEP ?? 0;
  const breaks = c.BREAK ?? 0;
  const other = summary.trackedMs - study - sleep - breaks;
  const stats = [
    { label: "Study", value: study, color: "#2563eb" },
    { label: "Sleep", value: sleep, color: "#4f46e5" },
    { label: "Breaks / gaps", value: breaks, color: "#9ca3af" },
    { label: "Other", value: other, color: "#78716c" },
    { label: "Untracked", value: summary.untrackedMs, color: "transparent" },
  ];
  const trackRows = tracks
    .map((t) => ({ ...t, ms: summary.byTrack[t.id] ?? 0 }))
    .filter((t) => t.ms > 0);

  return (
    <section aria-label="Day summary" className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2 rounded-full border border-muted-foreground/40"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{formatDuration(s.value)}</dd>
          </div>
        ))}
      </dl>
      {trackRows.length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {trackRows.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name}:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatDuration(t.ms)}
              </span>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
