import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProgressMeter } from "@/components/progress-meter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/dal";
import { RoadmapTree, StatusDot } from "@/modules/tracks-topics/components/roadmap-tree";
import { STATUS_LABEL, TOPIC_STATUSES } from "@/modules/tracks-topics/roadmap";
import { getRoadmap } from "@/modules/tracks-topics/service";

export const metadata: Metadata = { title: "Topics" };

export default function TopicsPage({ searchParams }: PageProps<"/topics">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Suspense fallback={<TopicsSkeleton />}>
        <TopicsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TopicsContent({ searchParams }: Pick<PageProps<"/topics">, "searchParams">) {
  const user = await requireUser();
  const tracks = await getRoadmap(user.id);
  const requested = (await searchParams).track;
  const track = tracks.find((t) => t.id === requested) ?? tracks[0];

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
        <p className="text-sm text-muted-foreground">
          Your roadmap per track. Progress counts the lowest-level topics; time comes from the
          timer.
        </p>
      </header>

      {!track ? (
        <p className="text-sm text-muted-foreground">No active tracks.</p>
      ) : (
        <>
          <nav aria-label="Tracks" className="flex flex-wrap gap-2">
            {tracks.map((t) => (
              <Link
                key={t.id}
                href={`/topics?track=${t.id}`}
                aria-current={t.id === track.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  t.id === track.id
                    ? "border-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(t.summary.progress * 100)}%
                </span>
              </Link>
            ))}
          </nav>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{track.name}</h2>
                  {track.description && (
                    <p className="text-sm text-muted-foreground">{track.description}</p>
                  )}
                </div>
                <dl className="flex gap-6 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Progress</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {Math.round(track.summary.progress * 100)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Time logged</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {formatDuration(track.summary.totalMs)}
                    </dd>
                  </div>
                </dl>
              </div>
              <ProgressMeter
                value={track.summary.progress}
                label={`${track.name} progress`}
                className="h-2"
              />
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {TOPIC_STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <StatusDot status={s} />
                    {STATUS_LABEL[s]}
                    <span className="font-medium text-foreground tabular-nums">
                      {track.summary.counts[s]}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <RoadmapTree
            // Remount per track so expand state starts fresh.
            key={track.id}
            trackId={track.id}
            trackName={track.name}
            roots={track.roots}
          />
        </>
      )}
    </>
  );
}

function TopicsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-9 w-96" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-[480px] w-full" />
    </div>
  );
}
