import type { Metadata } from "next";
import { Suspense } from "react";

import { TabNav } from "@/components/tab-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";
import { PresentationsTab, QuestionsTab } from "@/modules/practice/components/practice-lists";
import { getPracticePage } from "@/modules/practice/service";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Practice" };

const TABS = [
  { id: "questions", label: "Question bank" },
  { id: "presentations", label: "Presentations" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function PracticePage({ searchParams }: PageProps<"/practice">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <p className="text-sm text-muted-foreground">
          Questions you expect to be asked, practised until they stick, and presentations you
          rehearse — for any track.
        </p>
      </header>
      <Suspense fallback={<PracticeSkeleton />}>
        <PracticeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PracticeContent({ searchParams }: Pick<PageProps<"/practice">, "searchParams">) {
  const user = await requireUser();
  const requested = (await searchParams).tab;
  const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : "questions";
  const [data, trackOptions] = await Promise.all([
    getPracticePage(user),
    listTrackOptions(user.id),
  ]);
  const tracks = trackOptions.map(({ id, name, color }) => ({ id, name, color }));
  const { summary } = data;
  const trend = summary.trend;

  const tiles = [
    {
      label: "Due today",
      value: String(summary.due),
      context: `${summary.questionCount} question${summary.questionCount === 1 ? "" : "s"} in the bank`,
    },
    {
      label: "Mastered",
      value: String(summary.mastered),
      context: "Finished the 30-day schedule",
    },
    {
      label: "Presentation score",
      value: trend.recent === null ? "–" : `${trend.recent}/5`,
      context:
        trend.recent === null
          ? "No scored presentations yet"
          : trend.previous === null
            ? `Average of last ${Math.min(5, trend.count)}`
            : `${trend.recent >= trend.previous ? "Up" : "Down"} from ${trend.previous} (5 before)`,
    },
    {
      label: "Presentations",
      value: String(summary.presentationCount),
      context: "Logged, all time",
    },
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</dd>
            <dd className="text-xs text-muted-foreground">{t.context}</dd>
          </div>
        ))}
      </dl>

      <TabNav
        label="Practice sections"
        current={tab}
        items={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          href: t.id === "questions" ? "/practice" : `/practice?tab=${t.id}`,
          badge: t.id === "questions" ? summary.due : undefined,
        }))}
      />

      {tab === "questions" && (
        <QuestionsTab questions={data.questions} tracks={tracks} today={data.today} />
      )}
      {tab === "presentations" && (
        <PresentationsTab demos={data.presentations} tracks={tracks} today={data.today} />
      )}
    </>
  );
}

function PracticeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
