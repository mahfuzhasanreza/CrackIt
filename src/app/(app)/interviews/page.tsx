import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";
import { AddInterviewButton, InterviewList } from "@/modules/jobs/components/interview-list";
import { MockList } from "@/modules/jobs/components/mock-list";
import { getInterviewsPage } from "@/modules/jobs/service";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Interviews" };

export default function InterviewsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <InterviewsContent />
      </Suspense>
    </div>
  );
}

async function InterviewsContent() {
  const user = await requireUser();
  const [page, tracks] = await Promise.all([getInterviewsPage(user), listTrackOptions(user.id)]);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
          <p className="text-sm text-muted-foreground">
            Real rounds from your applications, plus mock practice.
          </p>
        </div>
        <AddInterviewButton applications={page.applications} timezone={user.timezone} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Upcoming</h2>
          </CardTitle>
          <CardDescription>Soonest first</CardDescription>
        </CardHeader>
        <CardContent>
          <InterviewList
            interviews={page.upcoming}
            timezone={user.timezone}
            empty="Nothing scheduled."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Past</h2>
          </CardTitle>
          <CardDescription>
            Record the questions and what you&apos;d do differently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InterviewList
            interviews={page.past}
            timezone={user.timezone}
            empty="No past interviews yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Mock interviews</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MockList
            mocks={page.mocks}
            tracks={tracks.map(({ id, name, color }) => ({ id, name, color }))}
            today={page.today}
          />
        </CardContent>
      </Card>
    </>
  );
}
