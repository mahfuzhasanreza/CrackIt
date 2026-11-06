import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { seriesVars } from "@/lib/palette";
import { cn } from "@/lib/utils";

export type ChartSeries = { id: string; label: string; light: string; dark: string };
export type ChartColumn = { key: string; label: string; values: Record<string, number> };

const CHART_PX = 180;
/** Show at most this many x-axis labels; value labels on the caps only when columns are few. */
const MAX_X_LABELS = 10;
/** Below the `sm` breakpoint, fewer labels so they don't collide. */
const MAX_X_LABELS_NARROW = 4;
const MAX_VALUE_LABELS = 14;

/**
 * Stacked columns, one baseline, fixed series order, 2px surface gap between segments.
 * Every column is a focusable hit target with a tooltip listing every series; a table view
 * mirrors the data. Server-renderable (the tooltip primitives are client leaves).
 */
export function ColumnChart({
  columns,
  series,
  ticks,
  format,
  compact,
  caption,
  highlightKey,
}: {
  columns: ChartColumn[];
  series: ChartSeries[];
  /** Axis ticks (values), first 0, last = top of the axis. */
  ticks: { value: number; label: string }[];
  format: (v: number) => string;
  compact: (v: number) => string;
  /** Names the chart for the table view and screen readers. */
  caption: string;
  highlightKey?: string;
}) {
  const top = ticks.at(-1)!.value || 1;
  const total = (c: ChartColumn) => series.reduce((a, s) => a + (c.values[s.id] ?? 0), 0);
  const every = Math.ceil(columns.length / MAX_X_LABELS);
  const everyNarrow = Math.ceil(columns.length / MAX_X_LABELS_NARROW);
  const showValues = columns.length <= MAX_VALUE_LABELS;

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

      <div className="flex gap-2">
        <div
          aria-hidden
          className="relative w-8 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums"
          style={{ height: CHART_PX }}
        >
          {ticks.map((t) => (
            <span
              key={t.value}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(t.value / top) * 100}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative" style={{ height: CHART_PX }}>
            {ticks.map((t) => (
              <div
                key={t.value}
                aria-hidden
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: `${(t.value / top) * 100}%` }}
              />
            ))}
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            >
              {columns.map((c) => {
                const sum = total(c);
                return (
                  <Tooltip key={c.key}>
                    <TooltipTrigger asChild>
                      <div
                        tabIndex={0}
                        aria-label={`${c.label}: ${format(sum)}`}
                        className="relative flex h-full flex-col items-center justify-end rounded-md outline-offset-2 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {showValues && sum > 0 && (
                          <span
                            aria-hidden
                            className="mb-1 text-[11px] font-medium whitespace-nowrap tabular-nums"
                          >
                            {compact(sum)}
                          </span>
                        )}
                        <div
                          className="flex w-[70%] max-w-6 min-w-[3px] flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]"
                          style={{ height: `${(sum / top) * 100}%` }}
                        >
                          {series.map((s) => {
                            const v = c.values[s.id] ?? 0;
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
                      <p className="mb-1 font-medium">{c.label}</p>
                      {series.map((s) => (
                        <p key={s.id} className="flex items-center gap-2">
                          <span
                            className="h-0.5 w-3 rounded-full bg-series"
                            style={seriesVars(s.light, s.dark)}
                          />
                          <span className="font-semibold tabular-nums">
                            {format(c.values[s.id] ?? 0)}
                          </span>
                          {series.length > 1 && <span className="opacity-80">{s.label}</span>}
                        </p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div
            aria-hidden
            className="mt-1.5 grid border-t border-border pt-1.5 text-center text-[11px] text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {columns.map((c, i) => {
              const fromEnd = columns.length - 1 - i;
              const wide = fromEnd % every === 0;
              const narrow = fromEnd % everyNarrow === 0;
              return (
                // The cell always stays in the grid; only its text hides by breakpoint.
                <span
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap",
                    c.key === highlightKey && "font-semibold text-foreground",
                  )}
                >
                  {(wide || narrow) && (
                    <span
                      className={cn(!narrow && "hidden sm:inline", narrow && !wide && "sm:hidden")}
                    >
                      {c.label}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <TableView
        caption={caption}
        headers={[...series.map((s) => s.label), ...(series.length > 1 ? ["Total"] : [])]}
      >
        {columns.map((c) => (
          <tr key={c.key} className="border-t">
            <td className="py-1 pr-3">{c.label}</td>
            {series.map((s) => (
              <td key={s.id} className="py-1 pr-3">
                {format(c.values[s.id] ?? 0)}
              </td>
            ))}
            {series.length > 1 && <td className="py-1 font-medium">{format(total(c))}</td>}
          </tr>
        ))}
      </TableView>
    </figure>
  );
}

/** Collapsed "Show as table" — every chart's non-visual twin. */
export function TableView({
  caption,
  first = "Period",
  headers,
  children,
}: {
  caption: string;
  first?: string;
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        Show as table
      </summary>
      <div className="mt-2 max-h-80 overflow-auto">
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-normal">{first}</th>
              {headers.map((h) => (
                <th key={h} className="py-1 pr-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </details>
  );
}
