import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";

export const metadata: Metadata = { title: "Dashboard" };

const upcoming = [
  { title: "Timer", detail: "One-click study / sleep / break tracking (Phase 3)" },
  { title: "Today", detail: "24-hour breakdown with untracked gaps (Phase 5)" },
  { title: "This week", detail: "Hours per track vs. goal, streaks (Phase 5)" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardTitle>{c.title}</CardTitle>
              <CardDescription>{c.detail}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

async function Greeting() {
  const user = await requireUser();
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: user.timezone,
  }).format(new Date());
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back{user.name ? `, ${user.name}` : ""}
      </h1>
      <p className="text-muted-foreground">{today}</p>
    </header>
  );
}

function GreetingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-40" />
    </div>
  );
}
