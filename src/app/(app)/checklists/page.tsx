import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";
import { ChecklistCard } from "@/modules/checklists/components/checklist-card";
import { NewChecklistButton } from "@/modules/checklists/components/new-checklist-button";
import { getChecklists } from "@/modules/checklists/service";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Checklists" };

const SECTIONS = [
  { type: "HABIT", title: "Habits", empty: "Daily or weekly habits, with streaks." },
  { type: "ROADMAP", title: "Roadmaps", empty: "Ordered steps toward a bigger goal." },
  { type: "ONE_OFF", title: "To-do lists", empty: "One-time tasks with due dates." },
] as const;

export default function ChecklistsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <Suspense fallback={<ChecklistsSkeleton />}>
        <ChecklistsContent />
      </Suspense>
    </div>
  );
}

async function ChecklistsContent() {
  const user = await requireUser();
  const [{ checklists }, tracks] = await Promise.all([
    getChecklists(user),
    listTrackOptions(user.id),
  ]);
  const trackChoices = tracks.map(({ id, name, color }) => ({ id, name, color }));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Checklists</h1>
          <p className="text-sm text-muted-foreground">
            Habits reset every day (or week); other lists are ticked once.
          </p>
        </div>
        <NewChecklistButton tracks={trackChoices} />
      </header>

      {SECTIONS.map((section) => {
        const lists = checklists.filter((c) => c.type === section.type);
        return (
          <section
            key={section.type}
            aria-labelledby={`section-${section.type}`}
            className="flex flex-col gap-4"
          >
            <h2 id={`section-${section.type}`} className="text-lg font-semibold">
              {section.title}
            </h2>
            {lists.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {section.empty} Create one with “New checklist”.
              </p>
            ) : (
              <div className="grid items-start gap-4 md:grid-cols-2">
                {lists.map((c) => (
                  <ChecklistCard key={c.id} checklist={c} tracks={trackChoices} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

function ChecklistsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-14 w-72" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
