import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ColumnChart } from "@/components/charts/column-chart";
import { LineChart } from "@/components/charts/line-chart";
import { niceTicks } from "@/components/charts/ticks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateKey, formatDuration, formatHoursCompact } from "@/lib/dates";
import { ACCENT, NEUTRAL, SLEEP, darkOf } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { KpiTiles } from "@/modules/analytics/components/kpi-tiles";
import { RankedBars } from "@/modules/analytics/components/ranked-bars";
import { StudyHeatmap } from "@/modules/analytics/components/study-heatmap";
import { FUNNEL_STAGES, parseRange, RANGES, type RangeKey } from "@/modules/analytics/compute";
import { type Analytics, getAnalytics } from "@/modules/analytics/service";
import { requireUser } from "@/modules/auth/dal";
import { GoalsPanel } from "@/modules/goals/components/goals-panel";
import { STATUS_LABEL } from "@/modules/jobs/labels";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Analytics" };

const HOUR = 3_600_000;
const BUCKET_WORD = { day: "day", week: "week", month: "month" } as const;

export default function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-14 w-full max-w-72" />
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

async function AnalyticsContent({ searchParams }: Pick<PageProps<"/analytics">, "searchParams">) {
  const user = await requireUser();
  const range = parseRange((await searchParams).range);
  const [data, tracks] = await Promise.all([getAnalytics(user, range), listTrackOptions(user.id)]);
  const trackChoices = tracks.map(({ id, name, color }) => ({ id, name, color }));
  const rangeLabel = RANGES[range].label;

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {formatDateKey(data.from)} – {formatDateKey(data.today, { year: "numeric" })}
        </p>
      </header>

      <RangeFilter current={range} />

      <KpiTiles data={data} rangeLabel={rangeLabel} />

      <GoalsPanel goals={data.goals} tracks={trackChoices} today={data.today} />

      <ChartCard title="Study time" description={`Hours per ${BUCKET_WORD[data.bucket]}, by track`}>
        <StudyColumns data={data} />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Where study time went"
          description={`Share per track, last ${rangeLabel}`}
        >
          {data.split.length === 0 ? (
            <Empty>No study logged in this range.</Empty>
          ) : (
            <RankedBars
              label="Study per track"
              rows={data.split.map((s) => ({
                id: s.id,
                label: s.name,
                value: s.ms,
                display: `${formatHoursCompact(s.ms)} · ${Math.round(s.share * 100)}%`,
                detail: formatDuration(s.ms),
                color: s.color ? { light: s.color, dark: darkOf(s.color) } : NEUTRAL,
                swatch: true,
              }))}
            />
          )}
        </ChartCard>
        <ChartCard
          title="Application funnel"
          description={`Applications sent in the last ${rangeLabel} and how far they got`}
        >
          <Funnel data={data} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Sleep per night"
          description={
            data.bucket === "day"
              ? "From tracked sleep, else your journal's bed and wake times"
              : `Average per ${BUCKET_WORD[data.bucket]}`
          }
        >
          {data.kpis.sleep.value === null ? (
            <Empty>No sleep recorded in this range.</Empty>
          ) : (
            <LineChart
              name="Sleep per night"
              format="duration"
              color={SLEEP}
              points={data.sleep}
              reference={{
                value: data.kpis.sleep.value,
                label: `avg ${formatHoursCompact(data.kpis.sleep.value)}`,
              }}
            />
          )}
        </ChartCard>
        <ChartCard
          title="Focus"
          description={`Average focus rating per ${BUCKET_WORD[data.bucket]}, weighted by session length`}
        >
          {data.kpis.focus.value === null ? (
            <Empty>Rate sessions when you stop the timer to see focus here.</Empty>
          ) : (
            <LineChart name="Focus rating" format="rating" color={ACCENT} points={data.focus} />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Problems solved"
        description={`First solves per ${BUCKET_WORD[data.bucket]}`}
      >
        <ColumnChart
          caption="Problems solved"
          columns={data.problems.map((p) => ({
            key: p.key,
            label: p.label,
            values: { solved: p.value },
          }))}
          series={[{ id: "solved", label: "Solved", ...ACCENT }]}
          ticks={niceTicks(Math.max(...data.problems.map((p) => p.value)), { integer: true }).map(
            (v) => ({ value: v, label: String(v) }),
          )}
          format={(v) => String(v)}
          compact={(v) => String(v)}
          highlightKey={data.problems.at(-1)?.key}
        />
      </ChartCard>

      <ChartCard
        title="Study heatmap"
        description={`Past year · ${Math.round(data.heatmap.totalMs / HOUR)}h over ${data.heatmap.activeDays} days`}
      >
        <StudyHeatmap weeks={data.heatmap.weeks} />
      </ChartCard>
    </>
  );
}

function RangeFilter({ current }: { current: RangeKey }) {
  return (
    <nav aria-label="Date range" className="flex flex-wrap gap-1">
      {(Object.keys(RANGES) as RangeKey[]).map((r) => (
        <Link
          key={r}
          href={r === "30d" ? "/analytics" : `/analytics?range=${r}`}
          aria-current={r === current ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
            r === current
              ? "border-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {r === current && <Check className="size-4" strokeWidth={3} aria-hidden />}
          Last {RANGES[r].label}
        </Link>
      ))}
    </nav>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const id = `chart-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <Card role="region" aria-labelledby={id} className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h2 id={id}>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function StudyColumns({ data }: { data: Analytics }) {
  const max = Math.max(
    0,
    ...data.study.columns.map((c) => Object.values(c.values).reduce((a, b) => a + b, 0)),
  );
  const ticks = niceTicks(max / HOUR).map((h) => ({ value: h * HOUR, label: `${h}h` }));
  return (
    <ColumnChart
      caption="Study time"
      columns={data.study.columns}
      series={data.study.series.map((s) => ({
        id: s.id,
        label: s.label,
        ...(s.color ? { light: s.color, dark: darkOf(s.color) } : NEUTRAL),
      }))}
      ticks={ticks}
      format={formatDuration}
      compact={formatHoursCompact}
      highlightKey={data.study.columns.at(-1)?.key}
    />
  );
}

function Funnel({ data }: { data: Analytics }) {
  const { counts, rejected, withdrawn, open } = data.funnel;
  if (counts.APPLIED === 0) return <Empty>No applications sent in this range.</Empty>;
  return (
    <div className="flex flex-col gap-4">
      <RankedBars
        label="Applications per stage"
        rows={FUNNEL_STAGES.map((stage, i) => {
          const prev = i === 0 ? null : counts[FUNNEL_STAGES[i - 1]!];
          const rate = prev ? Math.round((counts[stage] / prev) * 100) : null;
          return {
            id: stage,
            label: STATUS_LABEL[stage],
            value: counts[stage],
            display: rate === null ? String(counts[stage]) : `${counts[stage]} · ${rate}%`,
            detail:
              rate === null
                ? "Applications sent"
                : `${rate}% of ${STATUS_LABEL[FUNNEL_STAGES[i - 1]!].toLowerCase()}`,
            color: ACCENT,
          };
        })}
      />
      <p className="text-sm text-muted-foreground">
        {open} still open · {rejected} rejected · {withdrawn} withdrawn
      </p>
    </div>
  );
}
