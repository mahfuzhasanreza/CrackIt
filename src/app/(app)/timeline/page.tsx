import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isValidDateKey, logicalDateKey, shiftDateKey } from "@/lib/dates";
import { requireUser } from "@/modules/auth/dal";
import { TimelineDatePicker } from "@/modules/time-tracking/components/date-picker";
import { DaySummaryCards } from "@/modules/time-tracking/components/day-summary-cards";
import { DayTimeline } from "@/modules/time-tracking/components/day-timeline";
import { getEntryOptions } from "@/modules/time-tracking/options";
import { getDay } from "@/modules/time-tracking/service";

export const metadata: Metadata = { title: "Timeline" };

export default function TimelinePage({ searchParams }: PageProps<"/timeline">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TimelineContent({ searchParams }: Pick<PageProps<"/timeline">, "searchParams">) {
  const user = await requireUser();
  const now = new Date();
  const today = logicalDateKey(now, user.timezone, user.dayStartHour);
  const requested = (await searchParams).date;
  const dateKey = typeof requested === "string" && isValidDateKey(requested) ? requested : today;

  const [day, options] = await Promise.all([getDay(user, dateKey, now), getEntryOptions(user.id)]);
  const heading = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-muted-foreground">
            {dateKey === today ? "Today" : "Timeline"} · day starts at{" "}
            {String(user.dayStartHour).padStart(2, "0")}:00
          </p>
        </div>
        <nav aria-label="Choose day" className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Previous day">
            <Link href={`/timeline?date=${shiftDateKey(dateKey, -1)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <TimelineDatePicker value={dateKey} max={today} />
          {dateKey < today ? (
            <Button asChild variant="outline" size="icon" aria-label="Next day">
              <Link href={`/timeline?date=${shiftDateKey(dateKey, 1)}`}>
                <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled aria-label="Next day">
              <ChevronRight />
            </Button>
          )}
          {dateKey !== today && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/timeline">Today</Link>
            </Button>
          )}
        </nav>
      </header>
      <DaySummaryCards summary={day.summary} tracks={options.tracks} />
      <DayTimeline
        window={day.window}
        now={now}
        entries={day.entries}
        segments={day.segments}
        gaps={day.summary.gaps}
        options={options}
        timezone={user.timezone}
      />
    </>
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full max-w-80" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}
