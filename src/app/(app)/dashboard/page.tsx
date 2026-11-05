import { ArrowRight, Timer } from "lucide-react";
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
import { requireUser } from "@/modules/auth/dal";
import { TodayChecklist } from "@/modules/checklists/components/today-checklist";
import { getTodayChecklist } from "@/modules/checklists/service";
import { Last7Chart } from "@/modules/dashboard/components/last7-chart";
import { StatTiles } from "@/modules/dashboard/components/stat-tiles";
import { TodayStrip } from "@/modules/dashboard/components/today-strip";
import { WeekGoals } from "@/modules/dashboard/components/week-goals";
import { getDashboard, getRevisionDue } from "@/modules/dashboard/service";
import { ROUND_LABEL } from "@/modules/jobs/labels";
import { getUpcomingInterviews } from "@/modules/jobs/service";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const [data, checklist, revision, interviews] = await Promise.all([
    getDashboard(user),
    getTodayChecklist(user),
    getRevisionDue(user),
    getUpcomingInterviews(user.id),
  ]);
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${data.todayKey}T00:00:00Z`));
  const weekStart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${data.week.startKey}T00:00:00Z`));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{user.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <Button asChild>
          <Link href="/timer">
            <Timer />
            Open timer
          </Link>
        </Button>
      </header>

      <StatTiles data={data} />

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Today</h2>
          </CardTitle>
          <CardDescription>
            Hover a block for details. Empty track = untracked time.
          </CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/timeline">
                Timeline <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <TodayStrip day={data.today} tracks={data.tracks} timezone={user.timezone} />
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Today&apos;s checklist</h2>
            </CardTitle>
            <CardDescription>Habits and anything due. Tick them off here.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/checklists">
                  Checklists <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <TodayChecklist habits={checklist.habits} due={checklist.due} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Due for revision</h2>
              </CardTitle>
              <CardDescription>Spaced repetition: 1, 3, 7, 14, 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y text-sm">
                {[
                  {
                    label: "Learning notes",
                    count: revision.notes,
                    href: "/journal/learning?due=1",
                  },
                  { label: "Problems", count: revision.problems, href: "/problems" },
                  { label: "Viva questions", count: revision.viva, href: "/lecturer?tab=viva" },
                ].map((r) => (
                  <li
                    key={r.label}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Link href={r.href} className="font-medium hover:underline">
                      {r.label}
                    </Link>
                    <span className="text-muted-foreground tabular-nums">
                      {r.count === 0 ? "None due" : `${r.count} due`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Upcoming interviews</h2>
              </CardTitle>
              <CardDescription>Next 14 days</CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/interviews">
                    All <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
              ) : (
                <ul className="flex flex-col divide-y text-sm">
                  {interviews.map((i) => (
                    <li key={i.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                      <Link
                        href={`/applications/${i.application.id}`}
                        className="font-medium hover:underline"
                      >
                        {i.application.organization.name} · {ROUND_LABEL[i.round]}
                      </Link>
                      <time
                        className="text-muted-foreground"
                        dateTime={i.scheduledAt.toISOString()}
                      >
                        {new Intl.DateTimeFormat("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: user.timezone,
                        }).format(i.scheduledAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>This week</h2>
            </CardTitle>
            <CardDescription>Since Monday {weekStart}, against your weekly targets</CardDescription>
          </CardHeader>
          <CardContent>
            <WeekGoals byTrack={data.week.byTrack} tracks={data.tracks} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Study, last 7 days</h2>
            </CardTitle>
            <CardDescription>Hours per day by track</CardDescription>
          </CardHeader>
          <CardContent>
            <Last7Chart days={data.last7} tracks={data.tracks} todayKey={data.todayKey} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-14 w-full max-w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
