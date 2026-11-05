import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dayOfWeek, formatDuration, formatHoursCompact } from "@/lib/dates";
import { NEUTRAL, darkOf, seriesVars } from "@/lib/palette";

import type { TrackOption } from "../../tracks-topics/repository";
import type { DayTotals } from "../../time-tracking/stats";

const HOUR = 3_600_000;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHART_PX = 160;

type Series = {
  id: string;
  label: string;
  light: string;
  dark: string;
  value: (d: DayTotals) => number;
};

/** Clean axis: 1h steps up to 4h, 2h up to 8h, then 4h. */
function axis(maxMs: number) {
  const maxH = Math.max(1, maxMs / HOUR);
  const step = maxH <= 4 ? 1 : maxH <= 8 ? 2 : 4;
  const top = Math.ceil(maxH / step) * step;
  return { top: top * HOUR, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

/** Study hours per day for the last 7 days, stacked by track (fixed track order). */
export function Last7Chart({
  days,
  tracks,
  todayKey,
}: {
  days: DayTotals[];
  tracks: TrackOption[];
  todayKey: string;
}) {
  const series: Series[] = tracks.map((t) => ({
    id: t.id,
    label: t.name,
    light: t.color,
    dark: darkOf(t.color),
    value: (d) => d.byTrack[t.id] ?? 0,
  }));
  if (days.some((d) => d.studyWithoutTrackMs > 0)) {
    series.push({ id: "none", label: "No track", ...NEUTRAL, value: (d) => d.studyWithoutTrackMs });
  }
  const total = (d: DayTotals) => series.reduce((a, s) => a + s.value(d), 0);
  const { top, ticks } = axis(Math.max(...days.map(total)));
  const label = (key: string) => `${WEEKDAY[dayOfWeek(key)]} ${Number(key.slice(8))}`;

  return (
    <figure className="flex flex-col gap-4">
      {series.length > 1 && (
        <ul
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
          aria-label="Legend"
        >
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[2px] bg-series"
                style={seriesVars(s.light, s.dark)}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2" aria-hidden>
        {/* y-axis */}
        <div
          className="relative w-7 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums"
          style={{ height: CHART_PX }}
        >
          {ticks.map((h) => (
            <span
              key={h}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${((h * HOUR) / top) * 100}%` }}
            >
              {h}h
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative" style={{ height: CHART_PX }}>
            {ticks.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: `${((h * HOUR) / top) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 grid grid-cols-7">
              {days.map((d) => {
                const sum = total(d);
                return (
                  <Tooltip key={d.key}>
                    <TooltipTrigger asChild>
                      {/* The whole column is the hit target, bigger than the bar. */}
                      <div
                        tabIndex={0}
                        aria-label={`${label(d.key)}: ${formatDuration(sum)} study`}
                        className="group relative flex h-full flex-col items-center justify-end rounded-md outline-offset-2 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {sum > 0 && (
                          <span className="mb-1 text-[11px] font-medium whitespace-nowrap tabular-nums">
                            {formatHoursCompact(sum)}
                          </span>
                        )}
                        <div
                          className="flex w-full max-w-6 flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]"
                          style={{ height: `${(sum / top) * 100}%` }}
                        >
                          {series.map((s) => {
                            const v = s.value(d);
                            return v > 0 ? (
                              <div
                                key={s.id}
                                className="w-full bg-series"
                                style={{ ...seriesVars(s.light, s.dark), flexGrow: v }}
                              />
                            ) : null;
                          })}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="mb-1 font-medium">{label(d.key)}</p>
                      {series.map((s) => (
                        <p key={s.id} className="flex items-center gap-2">
                          <span
                            className="h-0.5 w-3 rounded-full bg-series"
                            style={seriesVars(s.light, s.dark)}
                          />
                          <span className="font-semibold tabular-nums">
                            {formatDuration(s.value(d))}
                          </span>
                          <span className="opacity-80">{s.label}</span>
                        </p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div className="mt-1.5 grid grid-cols-7 border-t border-border pt-1.5 text-center text-[11px] text-muted-foreground">
            {days.map((d) => (
              <span
                key={d.key}
                className={d.key === todayKey ? "font-semibold text-foreground" : undefined}
              >
                {label(d.key)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Show as table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 font-normal">Day</th>
                {series.map((s) => (
                  <th key={s.id} className="py-1 pr-3 font-normal">
                    {s.label}
                  </th>
                ))}
                <th className="py-1 font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.key} className="border-t">
                  <td className="py-1 pr-3">{label(d.key)}</td>
                  {series.map((s) => (
                    <td key={s.id} className="py-1 pr-3">
                      {formatDuration(s.value(d))}
                    </td>
                  ))}
                  <td className="py-1 font-medium">{formatDuration(total(d))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
