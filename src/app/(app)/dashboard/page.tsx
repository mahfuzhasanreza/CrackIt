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
import { Last7Chart } from "@/modules/dashboard/components/last7-chart";
import { StatTiles } from "@/modules/dashboard/components/stat-tiles";
import { TodayStrip } from "@/modules/dashboard/components/today-strip";
import { WeekGoals } from "@/modules/dashboard/components/week-goals";
import { getDashboard } from "@/modules/dashboard/service";

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
  const data = await getDashboard(user);
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
      <Skeleton className="h-14 w-72" />
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
