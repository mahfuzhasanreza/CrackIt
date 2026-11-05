import { Flame } from "lucide-react";

import { formatDuration } from "@/lib/dates";

import type { Dashboard } from "../service";

/** Headline numbers. Stat tiles: label · value · context line (no chart). */
export function StatTiles({ data }: { data: Dashboard }) {
  const s = data.today.summary;
  const study = s.byCategory.STUDY ?? 0;
  const tiles = [
    {
      label: "Studied today",
      value: formatDuration(study),
      context: `${formatDuration(data.week.studyMs)} this week`,
    },
    {
      label: "Sleep today",
      value: formatDuration(s.byCategory.SLEEP ?? 0),
      context: "Since day start",
    },
    {
      label: "Untracked today",
      value: formatDuration(s.untrackedMs),
      context: s.elapsedMs
        ? `${Math.round((s.untrackedMs / s.elapsedMs) * 100)}% of the day so far`
        : "Day hasn't started",
    },
    {
      label: "Study streak",
      value: `${data.streak.current} ${data.streak.current === 1 ? "day" : "days"}`,
      context: `Best ${data.streak.best} · ≥ ${formatDuration(data.streak.thresholdMs)} a day`,
      icon: data.streak.current > 0,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">{t.label}</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
            {t.icon && <Flame className="size-5 text-orange-500" aria-hidden />}
            {t.value}
          </dd>
          <dd className="mt-1 text-xs text-muted-foreground">{t.context}</dd>
        </div>
      ))}
    </dl>
  );
}
