import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logicalDateKey } from "@/lib/dates";
import { requireUser } from "@/modules/auth/dal";
import { DaySummaryCards } from "@/modules/time-tracking/components/day-summary-cards";
import { TimerPanel } from "@/modules/time-tracking/components/timer-panel";
import { getEntryOptions } from "@/modules/time-tracking/options";
import { getDay, getRunningEntry } from "@/modules/time-tracking/service";

export const metadata: Metadata = { title: "Timer" };

export default function TimerPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Timer</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/timeline">
            <CalendarClock />
            Timeline
          </Link>
        </Button>
      </header>
      <Suspense fallback={<TimerSkeleton />}>
        <TimerContent />
      </Suspense>
    </div>
  );
}

async function TimerContent() {
  const user = await requireUser();
  const now = new Date();
  const [running, options, today] = await Promise.all([
    getRunningEntry(user.id),
    getEntryOptions(user.id),
    getDay(user, logicalDateKey(now, user.timezone, user.dayStartHour), now),
  ]);
  return (
    <>
      <TimerPanel running={running} options={options} serverNow={now} timezone={user.timezone} />
      <section aria-labelledby="today-heading" className="flex flex-col gap-3">
        <h2 id="today-heading" className="text-sm font-medium text-muted-foreground">
          Today so far
        </h2>
        <DaySummaryCards summary={today.summary} tracks={options.tracks} />
      </section>
    </>
  );
}

function TimerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
