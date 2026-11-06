import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { InterviewOutcome, InterviewRound } from "@/generated/prisma/enums";
import { monthGrid, shiftMonth } from "@/lib/calendar";
import { formatDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { OUTCOME_LABEL, ROUND_LABEL } from "../labels";

export type CalendarInterview = {
  id: string;
  dayKey: string;
  time: string;
  round: InterviewRound;
  outcome: InterviewOutcome;
  organization: string;
};
export type CalendarMock = {
  id: string;
  dateKey: string;
  type: InterviewRound;
  partner: string | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Chip({ i }: { i: CalendarInterview }) {
  return (
    <Link
      href={`/interviews/${i.id}`}
      title={`${i.time} ${ROUND_LABEL[i.round]} · ${i.organization} (${OUTCOME_LABEL[i.outcome]})`}
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-xs hover:underline",
        i.outcome === "CANCELLED"
          ? "text-muted-foreground line-through"
          : "bg-primary text-primary-foreground",
      )}
    >
      <span className="tabular-nums">{i.time}</span> {ROUND_LABEL[i.round]} · {i.organization}
    </Link>
  );
}

function MockChip({ m }: { m: CalendarMock }) {
  return (
    <span className="block truncate rounded border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground">
      Mock · {ROUND_LABEL[m.type]}
      {m.partner ? ` · ${m.partner}` : ""}
    </span>
  );
}

/**
 * Month view (Monday first) of real interviews and mock practice. On phones it collapses to an
 * agenda: only the days that have something on them.
 */
export function InterviewCalendar({
  month,
  todayKey,
  interviews,
  mocks,
}: {
  /** First day of the month shown, "YYYY-MM-01". */
  month: string;
  todayKey: string;
  interviews: CalendarInterview[];
  mocks: CalendarMock[];
}) {
  const weeks = monthGrid(month);
  const byDay = new Map<string, { interviews: CalendarInterview[]; mocks: CalendarMock[] }>();
  const at = (k: string) => {
    if (!byDay.has(k)) byDay.set(k, { interviews: [], mocks: [] });
    return byDay.get(k)!;
  };
  for (const i of interviews) at(i.dayKey).interviews.push(i);
  for (const m of mocks) at(m.dateKey).mocks.push(m);
  const monthLabel = formatDateKey(month, { day: undefined, month: "long", year: "numeric" });
  const href = (m: string) => `/interviews?view=calendar&month=${m.slice(0, 7)}`;
  const agenda = weeks
    .flat()
    .filter((d) => d.inMonth && byDay.has(d.key))
    .map((d) => ({ key: d.key, ...byDay.get(d.key)! }));

  return (
    <section aria-label={`Calendar, ${monthLabel}`} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={href(shiftMonth(month, -1))} aria-label="Previous month">
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={href(`${todayKey.slice(0, 7)}-01`)}>Today</Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={href(shiftMonth(month, 1))} aria-label="Next month">
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>

      {/* Phones: agenda of days with something on. */}
      <div className="sm:hidden">
        {agenda.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing this month.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {agenda.map((d) => (
              <li key={d.key} className="flex gap-3 p-3">
                <span
                  className={cn(
                    "w-20 shrink-0 text-sm whitespace-nowrap",
                    d.key === todayKey ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {formatDateKey(d.key, { weekday: "short" })}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {d.interviews.map((i) => (
                    <Chip key={i.id} i={i} />
                  ))}
                  {d.mocks.map((m) => (
                    <MockChip key={m.id} m={m} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Larger screens: the month grid. */}
      <div className="hidden overflow-hidden rounded-xl border sm:block">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((d, idx) => {
            const items = byDay.get(d.key);
            return (
              <div
                key={d.key}
                className={cn(
                  "flex min-h-24 min-w-0 flex-col gap-1 border-b p-1.5",
                  idx % 7 !== 6 && "border-r",
                  !d.inMonth && "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    !d.inMonth && "text-muted-foreground",
                    d.key === todayKey && "bg-foreground font-semibold text-background",
                  )}
                  aria-label={formatDateKey(d.key, { weekday: "long", year: "numeric" })}
                >
                  {Number(d.key.slice(8))}
                </span>
                {items?.interviews.map((i) => (
                  <Chip key={i.id} i={i} />
                ))}
                {items?.mocks.map((m) => (
                  <MockChip key={m.id} m={m} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
