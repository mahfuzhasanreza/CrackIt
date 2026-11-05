import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/dal";
import { AddApplicationButton } from "@/modules/jobs/components/add-application-button";
import { KanbanBoard } from "@/modules/jobs/components/kanban-board";
import { OrganizationsList } from "@/modules/jobs/components/organizations-list";
import { getBoard, listOrganizations } from "@/modules/jobs/service";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  return (
    <div className="mx-auto flex max-w-[100rem] flex-col gap-6">
      <Suspense fallback={<BoardSkeleton />}>
        <ApplicationsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ApplicationsContent({
  searchParams,
}: Pick<PageProps<"/applications">, "searchParams">) {
  const user = await requireUser();
  const view = (await searchParams).view === "organizations" ? "organizations" : "board";
  const [board, orgs, tracks] = await Promise.all([
    getBoard(user),
    listOrganizations(user.id),
    listTrackOptions(user.id),
  ]);
  const trackChoices = tracks.map(({ id, name, color }) => ({ id, name, color }));
  const orgNames = orgs.map((o) => o.name);
  const open = board.columns
    .filter((c) => !["REJECTED", "WITHDRAWN"].includes(c.status))
    .reduce((n, c) => n + c.cards.length, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">
            {open} open · drag a card to move it, or use its menu.
          </p>
        </div>
        <AddApplicationButton organizations={orgNames} tracks={trackChoices} today={board.today} />
      </header>

      <nav aria-label="Applications views" className="flex gap-1 border-b">
        {(
          [
            ["board", "Board"],
            ["organizations", `Organizations (${orgs.length})`],
          ] as const
        ).map(([id, label]) => (
          <Link
            key={id}
            href={id === "board" ? "/applications" : "/applications?view=organizations"}
            aria-current={view === id ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              view === id
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {view === "board" ? (
        <KanbanBoard
          board={board}
          organizations={orgNames}
          tracks={trackChoices}
          timezone={user.timezone}
        />
      ) : (
        <OrganizationsList
          organizations={orgs.map(({ _count, ...o }) => ({
            ...o,
            applicationCount: _count.applications,
          }))}
        />
      )}
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-14 w-full max-w-72" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-96 w-64 shrink-0" />
        ))}
      </div>
    </div>
  );
}
