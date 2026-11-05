import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";
import { AddProblemButton } from "@/modules/problems/components/problem-dialogs";
import { ProblemFilters } from "@/modules/problems/components/problem-filters";
import { ProblemsTable } from "@/modules/problems/components/problems-table";
import { ReviewQueue } from "@/modules/problems/components/review-queue";
import { getProblemsPage } from "@/modules/problems/service";
import { problemFilterSchema } from "@/modules/problems/validators";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Problems" };

export default function ProblemsPage({ searchParams }: PageProps<"/problems">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Suspense fallback={<ProblemsSkeleton />}>
        <ProblemsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProblemsContent({ searchParams }: Pick<PageProps<"/problems">, "searchParams">) {
  const user = await requireUser();
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const filter = problemFilterSchema.parse({
    q: first(raw.q),
    status: first(raw.status),
    difficulty: first(raw.difficulty),
    platform: first(raw.platform),
    tag: first(raw.tag),
  });

  const [{ today, problems, due, stats, patterns }, tracks] = await Promise.all([
    getProblemsPage(user, filter),
    listTrackOptions(user.id),
  ]);
  const solvedTotal = stats.solved.EASY + stats.solved.MEDIUM + stats.solved.HARD;
  const filtered = Object.values(filter).some(Boolean);
  const tiles = [
    { label: "Solved", value: solvedTotal, context: `of ${stats.total} tracked` },
    { label: "Easy", value: stats.solved.EASY, context: "solved" },
    { label: "Medium", value: stats.solved.MEDIUM, context: "solved" },
    { label: "Hard", value: stats.solved.HARD, context: "solved" },
    {
      label: "Needs revision",
      value: stats.byStatus.NEEDS_REVISION,
      context: `${stats.byStatus.ATTEMPTED} attempted, ${stats.byStatus.TODO} to do`,
    },
  ];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
          <p className="text-sm text-muted-foreground">
            DSA practice: log attempts, tag patterns, revise what you&apos;ve solved.
          </p>
        </div>
        <AddProblemButton tracks={tracks} />
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</dd>
            <dd className="text-xs text-muted-foreground">{t.context}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Revision queue</h2>
          </CardTitle>
          <CardDescription>
            {due.length === 0 ? "All caught up" : `${due.length} due today`}. Re-solve without
            looking at your notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewQueue due={due} today={today} />
        </CardContent>
      </Card>

      <section aria-labelledby="all-problems" className="flex flex-col gap-3">
        <h2 id="all-problems" className="text-lg font-semibold">
          All problems
        </h2>
        <ProblemFilters filter={filter} patterns={patterns} />
        {problems.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {filtered ? "No problems match these filters." : "No problems yet. Add the first one."}
          </p>
        ) : (
          <ProblemsTable problems={problems} tracks={tracks} today={today} />
        )}
      </section>
    </>
  );
}

function ProblemsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-14 w-full max-w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
