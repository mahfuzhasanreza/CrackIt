import { BookOpenCheck, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isValidDateKey, logicalDateKey, shiftDateKey } from "@/lib/dates";
import { requireUser } from "@/modules/auth/dal";
import { DailyLogForm } from "@/modules/journal/components/daily-log-form";
import { DueList } from "@/modules/journal/components/due-list";
import { LearningEntryCard } from "@/modules/journal/components/learning-entry-card";
import { LearningEntryButton } from "@/modules/journal/components/learning-entry-dialog";
import { getJournalDay } from "@/modules/journal/service";
import { TimelineDatePicker } from "@/modules/time-tracking/components/date-picker";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage({ searchParams }: PageProps<"/journal">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Suspense fallback={<JournalSkeleton />}>
        <JournalContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function JournalContent({ searchParams }: Pick<PageProps<"/journal">, "searchParams">) {
  const user = await requireUser();
  const now = new Date();
  const today = logicalDateKey(now, user.timezone, user.dayStartHour);
  const tomorrow = shiftDateKey(today, 1);
  const requested = (await searchParams).date;
  const dateKey =
    typeof requested === "string" && isValidDateKey(requested) && requested <= tomorrow
      ? requested
      : today;

  const [day, tracks] = await Promise.all([
    getJournalDay(user, dateKey, now),
    listTrackOptions(user.id),
  ]);
  const heading = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
  const relative = dateKey === today ? "Today" : dateKey === tomorrow ? "Tomorrow" : "Journal";

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-muted-foreground">{relative}</p>
        </div>
        <nav aria-label="Choose day" className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Previous day">
            <Link href={`/journal?date=${shiftDateKey(dateKey, -1)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <TimelineDatePicker value={dateKey} max={tomorrow} basePath="/journal" />
          {dateKey < tomorrow ? (
            <Button asChild variant="outline" size="icon" aria-label="Next day">
              <Link href={`/journal?date=${shiftDateKey(dateKey, 1)}`}>
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
              <Link href="/journal">Today</Link>
            </Button>
          )}
        </nav>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Daily log</h2>
              </CardTitle>
              <CardDescription>Sleep, mood, plan and how the day went.</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyLogForm dateKey={dateKey} log={day.log} timezone={user.timezone} />
            </CardContent>
          </Card>

          <section aria-labelledby="learned-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="learned-heading" className="text-lg font-semibold">
                  What I learned
                </h2>
                <p className="text-sm text-muted-foreground">
                  {day.entries.length === 0
                    ? "Nothing logged for this day yet."
                    : `${day.entries.length} ${day.entries.length === 1 ? "entry" : "entries"}`}
                </p>
              </div>
              {dateKey <= today && (
                <LearningEntryButton
                  target={{ mode: "add", dateKey }}
                  tracks={tracks}
                  today={day.today}
                />
              )}
            </div>
            {day.entries.map((e) => (
              <LearningEntryCard key={e.id} entry={e} tracks={tracks} today={day.today} />
            ))}
          </section>
        </div>

        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>
              <h2>Due for revision</h2>
            </CardTitle>
            <CardDescription>
              {day.dueCount === 0 ? "All caught up" : `${day.dueCount} to revise today`}
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/journal/learning">
                  <BookOpenCheck />
                  All notes
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <DueList due={day.due} dueCount={day.dueCount} today={day.today} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function JournalSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full max-w-80" />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-[520px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
