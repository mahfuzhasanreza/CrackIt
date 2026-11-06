import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabNav } from "@/components/tab-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { parseMonthKey } from "@/lib/calendar";
import { toDateKey } from "@/lib/dates";
import { requireUser } from "@/modules/auth/dal";
import { InterviewCalendar } from "@/modules/jobs/components/interview-calendar";
import { AddInterviewButton, InterviewList } from "@/modules/jobs/components/interview-list";
import { MockList } from "@/modules/jobs/components/mock-list";
import { formatTimeOfDay } from "@/modules/jobs/format";
import { getInterviewsPage, type InterviewsPage } from "@/modules/jobs/service";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Interviews" };

export default function InterviewsRoute({ searchParams }: PageProps<"/interviews">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-14 w-full max-w-72" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        }
      >
        <InterviewsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function InterviewsContent({ searchParams }: Pick<PageProps<"/interviews">, "searchParams">) {
  const user = await requireUser();
  const params = await searchParams;
  const view = params.view === "calendar" ? "calendar" : "list";
  const [page, tracks] = await Promise.all([getInterviewsPage(user), listTrackOptions(user.id)]);
  const calendarToday = toDateKey(page.now, user.timezone);
  const month = parseMonthKey(params.month) ?? `${calendarToday.slice(0, 7)}-01`;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
          <p className="text-sm text-muted-foreground">
            Every round of every application, what they asked, and your mock practice.
          </p>
        </div>
        <AddInterviewButton applications={page.applications} timezone={user.timezone} />
      </header>

      <Stats stats={page.stats} upcoming={page.upcoming.length} />

      <TabNav
        label="Interview views"
        current={view}
        items={[
          { id: "list", label: "List", href: "/interviews" },
          { id: "calendar", label: "Calendar", href: "/interviews?view=calendar" },
        ]}
      />

      {view === "calendar" ? (
        <InterviewCalendar
          month={month}
          todayKey={calendarToday}
          interviews={page.all.map((i) => ({
            id: i.id,
            dayKey: i.dayKey,
            time: formatTimeOfDay(i.scheduledAt, user.timezone),
            round: i.round,
            outcome: i.outcome,
            organization: i.application.organization.name,
          }))}
          mocks={page.mocks.map((m) => ({
            id: m.id,
            dateKey: m.dateKey,
            type: m.type,
            partner: m.partner,
          }))}
        />
      ) : (
        <>
          {page.needsOutcome.length > 0 && (
            <Section
              title={`Needs an outcome (${page.needsOutcome.length})`}
              description="These have happened — record how they went."
            >
              <InterviewList
                interviews={page.needsOutcome}
                timezone={user.timezone}
                now={page.now}
                variant="needsOutcome"
                empty=""
              />
            </Section>
          )}

          <Section title={`Upcoming (${page.upcoming.length})`} description="Soonest first">
            <InterviewList
              interviews={page.upcoming}
              timezone={user.timezone}
              now={page.now}
              variant="upcoming"
              empty="Nothing scheduled. Add an interview when one is booked."
            />
          </Section>

          <Section
            title="Past"
            description="Open one to record the questions and what you'd do differently."
          >
            <InterviewList
              interviews={page.past}
              timezone={user.timezone}
              empty="No finished interviews yet."
            />
          </Section>

          <Section title="Mock interviews">
            <MockList
              mocks={page.mocks}
              tracks={tracks.map(({ id, name, color }) => ({ id, name, color }))}
              today={page.today}
            />
          </Section>
        </>
      )}
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <CardTitle>
          <h2 id={id}>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Stats({ stats, upcoming }: { stats: InterviewsPage["stats"]; upcoming: number }) {
  const tiles = [
    {
      label: "Next 7 days",
      value: String(stats.nextWeek),
      context: `${upcoming} upcoming in total`,
    },
    {
      label: "Pass rate",
      value: stats.passRate === null ? "—" : `${Math.round(stats.passRate * 100)}%`,
      context: stats.done ? `${stats.passed} of ${stats.done} with a result` : "No results yet",
    },
    {
      label: "How they felt",
      value: stats.avgRating === null ? "—" : `${stats.avgRating.toFixed(1)} / 5`,
      context: "Your own rating, on average",
    },
    {
      label: "Mock practice",
      value: String(stats.mocksDone),
      context:
        stats.avgMockScore === null
          ? "Mocks done"
          : `Mocks done · average score ${stats.avgMockScore.toFixed(1)}`,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">{t.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{t.value}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">{t.context}</dd>
        </div>
      ))}
    </dl>
  );
}
