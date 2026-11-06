import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateKey as formatDay } from "@/lib/dates";
import { requireUser } from "@/modules/auth/dal";
import { ApplicationActions } from "@/modules/jobs/components/application-actions";
import { AddInterviewButton, InterviewList } from "@/modules/jobs/components/interview-list";
import { ORG_TYPE_LABEL, STATUS_LABEL } from "@/modules/jobs/labels";
import { getApplicationDetail, listOrganizations } from "@/modules/jobs/service";
import { listTrackOptions } from "@/modules/tracks-topics/repository";

export const metadata: Metadata = { title: "Application" };

export default function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href="/applications"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Applications
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ApplicationContent params={params} />
      </Suspense>
    </div>
  );
}

async function ApplicationContent({ params }: Pick<PageProps<"/applications/[id]">, "params">) {
  const user = await requireUser();
  const { id } = await params;
  const detail = /^[0-9a-f-]{36}$/i.test(id) ? await getApplicationDetail(user, id) : null;
  if (!detail) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        This application doesn&apos;t exist (it may have been deleted).
      </p>
    );
  }
  const { application: a, today } = detail;
  const [orgs, tracks] = await Promise.all([listOrganizations(user.id), listTrackOptions(user.id)]);
  const when = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: user.timezone,
    }).format(d);
  const facts = [
    ["Status", STATUS_LABEL[a.status]],
    ["Organization", `${a.organization.name} (${ORG_TYPE_LABEL[a.organization.type]})`],
    ["Track", a.track?.name],
    ["Applied", a.appliedOn && formatDay(a.appliedOn)],
    ["Deadline", a.deadlineOn && formatDay(a.deadlineOn)],
    ["Source", a.source],
    ["Salary", a.salaryRange],
  ].filter((f): f is [string, string] => Boolean(f[1]));
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{a.role}</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            {a.organization.name}
            <Badge variant="outline">{STATUS_LABEL[a.status]}</Badge>
            {a.jobUrl && (
              <a
                href={a.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm hover:text-foreground"
              >
                Job posting <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </p>
        </div>
        <ApplicationActions
          application={{
            id: a.id,
            role: a.role,
            status: a.status,
            organization: a.organization,
            track: a.track,
            jobUrl: a.jobUrl,
            source: a.source,
            appliedOn: a.appliedOn,
            deadlineOn: a.deadlineOn,
            salaryRange: a.salaryRange,
            notesMd: a.notesMd,
          }}
          organizations={orgs.map((o) => o.name)}
          tracks={tracks.map(({ id, name, color }) => ({ id, name, color }))}
          today={today}
        />
      </header>

      <div className="grid items-start gap-6 md:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Interviews</h2>
              </CardTitle>
              <CardAction>
                <AddInterviewButton
                  applicationId={a.id}
                  timezone={user.timezone}
                  variant="outline"
                />
              </CardAction>
            </CardHeader>
            <CardContent>
              <InterviewList
                interviews={a.interviews}
                timezone={user.timezone}
                showApplication={false}
                empty="No interviews yet."
              />
            </CardContent>
          </Card>
          {a.notesMd.trim() && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Notes</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Markdown>{a.notesMd}</Markdown>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <dl className="flex flex-col gap-2 text-sm">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card role="region" aria-labelledby="history-heading">
            <CardHeader>
              <CardTitle>
                <h2 id="history-heading">History</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 border-l pl-4 text-sm">
                {a.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-foreground"
                    />
                    <p className="font-medium">
                      {e.fromStatus
                        ? `Moved to ${STATUS_LABEL[e.toStatus]}`
                        : `Added to ${STATUS_LABEL[e.toStatus]}`}
                    </p>
                    <time className="text-xs text-muted-foreground" dateTime={e.at.toISOString()}>
                      {when(e.at)}
                    </time>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
