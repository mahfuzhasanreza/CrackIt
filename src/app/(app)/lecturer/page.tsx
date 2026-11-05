import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/dal";
import {
  CoursesTab,
  DemosTab,
  PublicationsTab,
  VivaTab,
} from "@/modules/lecturer/components/lecturer-lists";
import { getLecturerPage } from "@/modules/lecturer/service";

export const metadata: Metadata = { title: "Lecturer" };

const TABS = [
  { id: "demos", label: "Teaching demos" },
  { id: "courses", label: "Courses" },
  { id: "publications", label: "Publications" },
  { id: "viva", label: "Viva bank" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function LecturerPage({ searchParams }: PageProps<"/lecturer">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Lecturer prep</h1>
        <p className="text-sm text-muted-foreground">
          Teaching demos, course readiness, publications and viva practice.
        </p>
      </header>
      <Suspense fallback={<LecturerSkeleton />}>
        <LecturerContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LecturerContent({ searchParams }: Pick<PageProps<"/lecturer">, "searchParams">) {
  const user = await requireUser();
  const requested = (await searchParams).tab;
  const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : "demos";
  const data = await getLecturerPage(user);
  const { summary } = data;
  const courseRefs = data.courses.map(({ id, name, code }) => ({ id, name, code }));

  const trend = summary.demoTrend;
  const tiles = [
    {
      label: "Demo self-score",
      value: trend.recent === null ? "–" : `${trend.recent}/5`,
      context:
        trend.recent === null
          ? "No scored demos yet"
          : trend.previous === null
            ? `Average of last ${Math.min(5, trend.count)}`
            : `${trend.recent >= trend.previous ? "Up" : "Down"} from ${trend.previous} (5 before)`,
    },
    {
      label: "Demos logged",
      value: String(summary.demoCount),
      context: "All time",
    },
    {
      label: "Course readiness",
      value: summary.averageReadiness === null ? "–" : `${summary.averageReadiness}/5`,
      context: `${data.courses.length} course${data.courses.length === 1 ? "" : "s"}`,
    },
    {
      label: "Publications",
      value: String(summary.publications.PUBLISHED + summary.publications.ACCEPTED),
      context: `accepted or published · ${summary.publications.SUBMITTED} under review`,
    },
    {
      label: "Viva practice",
      value: `${summary.vivaDue} due`,
      context: `${summary.vivaTotal} question${summary.vivaTotal === 1 ? "" : "s"} in the bank`,
    },
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</dd>
            <dd className="text-xs text-muted-foreground">{t.context}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Lecturer sections" className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/lecturer?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              tab === t.id
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.id === "viva" && summary.vivaDue > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                {summary.vivaDue}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "demos" && <DemosTab demos={data.demos} courses={courseRefs} today={data.today} />}
      {tab === "courses" && <CoursesTab courses={data.courses} />}
      {tab === "publications" && (
        <PublicationsTab publications={data.publications} today={data.today} />
      )}
      {tab === "viva" && <VivaTab questions={data.viva} courses={courseRefs} today={data.today} />}
    </>
  );
}

function LecturerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
