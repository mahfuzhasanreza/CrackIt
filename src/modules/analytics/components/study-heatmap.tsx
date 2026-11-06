"use client";

import { useEffect, useRef, useState } from "react";

import { TableView } from "@/components/charts/column-chart";
import { formatDateKey, formatDuration } from "@/lib/dates";
import { HEAT, seriesVars } from "@/lib/palette";
import { cn } from "@/lib/utils";

type Cell = { key: string; ms: number; level: 0 | 1 | 2 | 3 | 4 } | null;

const LEVEL_LABEL = ["No study", "Under 1h", "1–2h", "2–4h", "4h or more"];
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

function CellBox({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={cn(
        "block size-[11px] rounded-[2px]",
        level === 0 ? "bg-muted" : "bg-series",
        className,
      )}
      style={level ? seriesVars(HEAT[level - 1]!.light, HEAT[level - 1]!.dark) : undefined}
    />
  );
}

/**
 * GitHub-style year of study: one column per week, darker (light mode) / brighter (dark mode)
 * = more study. Hovering a day shows its total; the table view lists months.
 */
export function StudyHeatmap({ weeks }: { weeks: Cell[][] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ key: string; ms: number } | null>(null);

  // Most recent weeks first in view on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const months: { key: string; label: string; ms: number; days: number }[] = [];
  for (const cell of weeks.flat()) {
    if (!cell) continue;
    const m = cell.key.slice(0, 7);
    if (months.at(-1)?.key !== m) {
      months.push({
        key: m,
        label: formatDateKey(`${m}-01`, { day: undefined, month: "short", year: "numeric" }),
        ms: 0,
        days: 0,
      });
    }
    months.at(-1)!.ms += cell.ms;
    if (cell.ms > 0) months.at(-1)!.days += 1;
  }

  const onOver = (e: React.PointerEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
    setHover(t ? { key: t.dataset.key!, ms: Number(t.dataset.ms) } : null);
  };

  return (
    <figure className="flex flex-col gap-3">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div
          className="flex w-max gap-2 pt-5"
          onPointerOver={onOver}
          onPointerLeave={() => setHover(null)}
          aria-hidden
        >
          <div className="flex flex-col gap-[2px] pr-1 text-[10px] leading-[11px] text-muted-foreground">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="h-[11px]">
                {d}
              </span>
            ))}
          </div>
          <div className="flex gap-[2px]">
            {weeks.map((week, w) => {
              const firstOfMonth = week.find((c) => c?.key.endsWith("-01"));
              const label = firstOfMonth ?? (w === 0 ? week.find(Boolean) : undefined);
              return (
                <div key={w} className="relative flex flex-col gap-[2px]">
                  {label && (
                    <span className="absolute -top-5 left-0 text-[10px] whitespace-nowrap text-muted-foreground">
                      {formatDateKey(label.key, { day: undefined, month: "short" })}
                    </span>
                  )}
                  {week.map((c, d) =>
                    c ? (
                      <span key={d} data-key={c.key} data-ms={c.ms}>
                        <CellBox
                          level={c.level}
                          className={cn(hover?.key === c.key && "outline-2 outline-foreground")}
                        />
                      </span>
                    ) : (
                      <span key={d} className="block size-[11px]" />
                    ),
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover readout: a fixed line, so it is never clipped by the scrolling grid. */}
      <p aria-hidden className="min-h-5 text-sm">
        {hover ? (
          <>
            <span className="font-semibold tabular-nums">
              {hover.ms ? formatDuration(hover.ms) : "No study"}
            </span>{" "}
            <span className="text-muted-foreground">
              {formatDateKey(hover.key, { weekday: "short", year: "numeric" })}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover a day to see its total.</span>
        )}
      </p>

      <ul
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
        aria-label="Legend"
      >
        {LEVEL_LABEL.map((l, i) => (
          <li key={l} className="flex items-center gap-1.5">
            <CellBox level={i} />
            {l}
          </li>
        ))}
      </ul>

      <TableView
        caption="Study per month, past year"
        first="Month"
        headers={["Study", "Days studied"]}
      >
        {months.map((m) => (
          <tr key={m.key} className="border-t">
            <td className="py-1 pr-3">{m.label}</td>
            <td className="py-1 pr-3">{formatDuration(m.ms)}</td>
            <td className="py-1 pr-3">{m.days}</td>
          </tr>
        ))}
      </TableView>
    </figure>
  );
}
