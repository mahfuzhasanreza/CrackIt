import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";
import { LearningEntryCard } from "@/modules/journal/components/learning-entry-card";
import { LearningEntryButton } from "@/modules/journal/components/learning-entry-dialog";
import { LearningFilters } from "@/modules/journal/components/learning-filters";
import { LEARNING_LIST_LIMIT, listLearning } from "@/modules/journal/service";
import { learningFilterSchema } from "@/modules/journal/validators";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Learning log" };

export default function LearningLogPage({ searchParams }: PageProps<"/journal/learning">) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Suspense fallback={<LearningSkeleton />}>
        <LearningContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LearningContent({
  searchParams,
}: Pick<PageProps<"/journal/learning">, "searchParams">) {
  const user = await requireUser();
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filter = learningFilterSchema.parse({
    q: first(raw.q) || undefined,
    tag: first(raw.tag) || undefined,
    track: first(raw.track) || undefined,
    due: first(raw.due),
  });

  const [{ today, entries, tags }, tracks] = await Promise.all([
    listLearning(user, filter),
    listTrackOptions(user.id),
  ]);
  const filtered = Boolean(filter.q || filter.tag || filter.track || filter.due);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/journal"
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Journal
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Learning log</h1>
          <p className="text-sm text-muted-foreground">
            Everything you&apos;ve learned, newest first.
          </p>
        </div>
        <LearningEntryButton
          target={{ mode: "add", dateKey: today }}
          tracks={tracks}
          today={today}
        />
      </header>

      <LearningFilters filter={filter} tags={tags} tracks={tracks} />

      <section aria-label="Learning entries" className="flex flex-col gap-4">
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {filtered ? "No entries match these filters." : "No learning entries yet."}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" role="status">
              {entries.length === LEARNING_LIST_LIMIT
                ? `Showing the latest ${LEARNING_LIST_LIMIT}. Narrow the filters to see older ones.`
                : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
            </p>
            {entries.map((e) => (
              <LearningEntryCard key={e.id} entry={e} tracks={tracks} today={today} showDate />
            ))}
          </>
        )}
      </section>
    </>
  );
}

function LearningSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
