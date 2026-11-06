import { ArrowDown, ArrowUp } from "lucide-react";

import { formatDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { Analytics } from "../service";

type Tile = {
  label: string;
  value: string;
  context: string;
  delta?: { change: number; text: string; upIsGood: boolean };
};

const MIN = 60_000;

/** Change vs the previous range; null when there's nothing to compare against. */
function delta(
  value: number | null,
  prev: number | null,
  upIsGood: boolean,
  format: (v: number) => string,
  epsilon: number,
): Tile["delta"] {
  if (value === null || prev === null) return undefined;
  const change = value - prev;
  if (Math.abs(change) < epsilon) return { change: 0, text: "Same as before", upIsGood };
  return { change, text: `${format(Math.abs(change))} vs previous`, upIsGood };
}

/** KPI row: label · value · change vs the previous period of the same length. */
export function KpiTiles({ data, rangeLabel }: { data: Analytics; rangeLabel: string }) {
  const k = data.kpis;
  const count = (n: number) => String(Math.round(n));
  const tiles: Tile[] = [
    {
      label: "Study",
      value: formatDuration(k.study.value),
      context: `${formatDuration(k.studyPerDay)} a day on average`,
      delta: delta(k.study.value, k.study.prev, true, formatDuration, MIN),
    },
    {
      label: "Sleep per night",
      value: k.sleep.value === null ? "—" : formatDuration(k.sleep.value),
      context: `${k.nightsLogged} ${k.nightsLogged === 1 ? "night" : "nights"} recorded`,
      delta: delta(k.sleep.value, k.sleep.prev, true, formatDuration, MIN),
    },
    {
      label: "Untracked per day",
      value: k.untracked.value === null ? "—" : formatDuration(k.untracked.value),
      context: "Time with nothing logged",
      delta: delta(k.untracked.value, k.untracked.prev, false, formatDuration, MIN),
    },
    {
      label: "Focus",
      value: k.focus.value === null ? "—" : `${k.focus.value.toFixed(1)} / 5`,
      context: "Weighted by session length",
      delta: delta(k.focus.value, k.focus.prev, true, (v) => v.toFixed(1), 0.05),
    },
    {
      label: "Problems solved",
      value: count(k.problems.value),
      context: "First solves",
      delta: delta(k.problems.value, k.problems.prev, true, count, 0.5),
    },
    {
      label: "Applications sent",
      value: count(k.applications.value),
      context: "By applied date",
      delta: delta(k.applications.value, k.applications.prev, true, count, 0.5),
    },
  ];

  return (
    <dl
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      aria-label={`Last ${rangeLabel}`}
    >
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">{t.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{t.value}</dd>
          {t.delta && <Delta {...t.delta} />}
          <dd className="mt-1 text-xs text-muted-foreground">{t.context}</dd>
        </div>
      ))}
    </dl>
  );
}

function Delta({ change, text, upIsGood }: NonNullable<Tile["delta"]>) {
  if (change === 0) return <dd className="mt-1 text-xs text-muted-foreground">{text}</dd>;
  const good = change > 0 === upIsGood;
  const Icon = change > 0 ? ArrowUp : ArrowDown;
  return (
    <dd
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-medium",
        good ? "text-[#006300] dark:text-[#0ca30c]" : "text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{change > 0 ? "Up" : "Down"}</span>
      {text}
    </dd>
  );
}
