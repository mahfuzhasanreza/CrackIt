import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDuration, formatTime } from "@/lib/dates";
import { NEUTRAL, SLEEP, darkOf, seriesVars } from "@/lib/palette";

import type { TrackOption } from "../../tracks-topics/repository";
import type { DayView } from "../../time-tracking/service";

const HOUR = 3_600_000;

type Part = {
  key: string;
  left: number;
  width: number;
  light: string;
  dark: string;
  label: string;
  range: string;
  duration: string;
};

/**
 * The day as one thin time strip: each tracked block at its time, colored by what matters
 * (study by track, sleep, everything else neutral); untracked time is the empty track.
 */
export function TodayStrip({
  day,
  tracks,
  timezone,
}: {
  day: DayView;
  tracks: TrackOption[];
  timezone: string;
}) {
  const { window, segments, entries, now, summary } = day;
  const span = window.end.getTime() - window.start.getTime();
  const pct = (d: Date) => ((d.getTime() - window.start.getTime()) / span) * 100;
  const byId = new Map(entries.map((e) => [e.id, e]));
  const trackById = new Map(tracks.map((t) => [t.id, t]));

  const parts: Part[] = segments.map((s) => {
    const e = byId.get(s.entryId)!;
    const track = e.trackId ? trackById.get(e.trackId) : undefined;
    const isStudyOnTrack = e.activityType.category === "STUDY" && track;
    const color = isStudyOnTrack
      ? { light: track.color, dark: darkOf(track.color) }
      : e.activityType.category === "SLEEP"
        ? SLEEP
        : NEUTRAL;
    return {
      key: s.entryId,
      left: pct(s.start),
      width: pct(s.end) - pct(s.start),
      ...color,
      label: [e.activityType.name, e.topic?.name ?? track?.name].filter(Boolean).join(" · "),
      range: `${formatTime(s.start, timezone)}–${s.running ? "now" : formatTime(s.end, timezone)}`,
      duration: formatDuration(s.end.getTime() - s.start.getTime()),
    };
  });

  const studyNoTrack = Math.max(
    0,
    (summary.byCategory.STUDY ?? 0) - tracks.reduce((a, t) => a + (summary.byTrack[t.id] ?? 0), 0),
  );
  const sleep = summary.byCategory.SLEEP ?? 0;
  const legend = [
    ...tracks.map((t) => ({
      label: t.name,
      ms: summary.byTrack[t.id] ?? 0,
      light: t.color,
      dark: darkOf(t.color),
    })),
    { label: "Sleep", ms: sleep, ...SLEEP },
    {
      label: "Other",
      ms: summary.trackedMs - sleep - tracks.reduce((a, t) => a + (summary.byTrack[t.id] ?? 0), 0),
      ...NEUTRAL,
    },
  ];
  const ticks = Array.from(
    { length: Math.floor(span / (4 * HOUR)) + 1 },
    (_, i) => new Date(window.start.getTime() + i * 4 * HOUR),
  );
  const nowPct = now > window.start && now < window.end ? pct(now) : null;

  return (
    <figure className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Today: ${legend.map((l) => `${l.label} ${formatDuration(l.ms)}`).join(", ")}, untracked ${formatDuration(summary.untrackedMs)}.`}
        className="relative h-6 rounded-md bg-muted"
      >
        {parts.map((p) => (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                aria-label={`${p.label}, ${p.range}, ${p.duration}`}
                className="absolute inset-y-0 rounded-[4px] bg-series outline-offset-2 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring"
                // 2px surface gap between touching blocks: inset each side by 1px.
                style={{
                  ...seriesVars(p.light, p.dark),
                  left: `calc(${p.left}% + 1px)`,
                  width: `max(calc(${p.width}% - 2px), 2px)`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold tabular-nums">{p.duration}</p>
              <p className="opacity-80">{p.label}</p>
              <p className="tabular-nums opacity-80">{p.range}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {nowPct !== null && (
          <span
            aria-hidden
            className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
            style={{ left: `${nowPct}%` }}
          />
        )}
      </div>
      <div aria-hidden className="relative h-4 text-[11px] text-muted-foreground tabular-nums">
        {ticks.map((t, i) => (
          <span
            key={t.toISOString()}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${pct(t)}%` }}
          >
            {i === ticks.length - 1 && pct(t) >= 99.9 ? "" : formatTime(t, timezone)}
          </span>
        ))}
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[2px] bg-series"
                style={seriesVars(l.light, l.dark)}
              />
              <span className="text-muted-foreground">{l.label}</span>
              <span className="font-medium tabular-nums">{formatDuration(l.ms)}</span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] border border-muted-foreground/40 bg-muted" />
            <span className="text-muted-foreground">Untracked</span>
            <span className="font-medium tabular-nums">{formatDuration(summary.untrackedMs)}</span>
          </li>
          {studyNoTrack > 0 && (
            <li className="text-muted-foreground">
              (incl. {formatDuration(studyNoTrack)} study without a track, shown as Other)
            </li>
          )}
        </ul>
      </figcaption>
    </figure>
  );
}
