import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { seriesVars } from "@/lib/palette";

export type RankedRow = {
  id: string;
  label: string;
  value: number;
  /** Printed at the bar's tip, e.g. "12h · 60%". */
  display: string;
  /** Extra tooltip line. */
  detail?: string;
  color: { light: string; dark: string };
  swatch?: boolean;
};

/**
 * Horizontal bars on one baseline (square at the baseline, 4px rounded tip), value at the tip.
 * Used for part-to-whole (track split) and the application funnel.
 */
export function RankedBars({ rows, label }: { rows: RankedRow[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3" aria-label={label}>
      {rows.map((r) => (
        <li key={r.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                tabIndex={0}
                aria-label={`${r.label}: ${r.display}${r.detail ? `, ${r.detail}` : ""}`}
                className="grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3 rounded-md outline-offset-2 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-sm">
                  {r.swatch && (
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px] bg-series"
                      style={seriesVars(r.color.light, r.color.dark)}
                    />
                  )}
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2" aria-hidden>
                  <span
                    className="h-3 shrink-0 rounded-r-[4px] bg-series"
                    style={{
                      ...seriesVars(r.color.light, r.color.dark),
                      width: r.value > 0 ? `max(2px, calc((100% - 6rem) * ${r.value / max}))` : 0,
                    }}
                  />
                  <span className="text-sm whitespace-nowrap tabular-nums">{r.display}</span>
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{r.label}</p>
              <p className="font-semibold tabular-nums">{r.display}</p>
              {r.detail && <p className="opacity-80">{r.detail}</p>}
            </TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
