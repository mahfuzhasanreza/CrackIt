import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/dal";
import { AddResourceButton, ResourceList } from "@/modules/resources/components/resource-list";
import { getResourcesPage } from "@/modules/resources/service";
import { resourceFilterSchema } from "@/modules/resources/validators";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-14 w-full max-w-72" />
            <Skeleton className="h-9 w-full max-w-md" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          </div>
        }
      >
        <ResourcesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const VIEWS = {
  active: { label: "Active", empty: "Nothing on the go. Add a book, course or problem sheet." },
  done: { label: "Done", empty: "Nothing finished yet — keep going." },
  dropped: { label: "Dropped", empty: "Nothing dropped." },
  all: { label: "All", empty: "No resources yet. Add a book, course or problem sheet." },
} as const;

async function ResourcesContent({ searchParams }: Pick<PageProps<"/resources">, "searchParams">) {
  const user = await requireUser();
  const { view } = resourceFilterSchema.parse(await searchParams);
  const [page, tracks] = await Promise.all([getResourcesPage(user), listTrackOptions(user.id)]);
  const trackChoices = tracks.map(({ id, name, color }) => ({ id, name, color }));
  const { counts } = page;
  const shown = page.resources.filter((r) =>
    view === "active"
      ? r.status === "IN_PROGRESS" || r.status === "PLANNED"
      : view === "done"
        ? r.status === "DONE"
        : view === "dropped"
          ? r.status === "DROPPED"
          : true,
  );
  const tabCount = {
    active: counts.IN_PROGRESS + counts.PLANNED,
    done: counts.DONE,
    dropped: counts.DROPPED,
    all: page.resources.length,
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            {counts.IN_PROGRESS} in progress · {counts.PLANNED} planned · {counts.DONE} done
          </p>
        </div>
        <AddResourceButton tracks={trackChoices} />
      </header>

      <nav aria-label="Resource views" className="flex gap-1 overflow-x-auto border-b">
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((id) => (
          <Link
            key={id}
            href={id === "active" ? "/resources" : `/resources?view=${id}`}
            aria-current={view === id ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              view === id
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {VIEWS[id].label} ({tabCount[id]})
          </Link>
        ))}
      </nav>

      <ResourceList resources={shown} tracks={trackChoices} emptyText={VIEWS[view].empty} />
    </>
  );
}
