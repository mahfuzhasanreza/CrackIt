import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/dal";
import { InterviewActions } from "@/modules/jobs/components/interview-actions";
import { OutcomeButtons } from "@/modules/jobs/components/interview-list";
import { formatWhen } from "@/modules/jobs/format";
import { OUTCOME_BADGE, OUTCOME_LABEL, ROUND_LABEL, STATUS_LABEL } from "@/modules/jobs/labels";
import { relativeTime } from "@/modules/jobs/rules";
import { getInterviewDetail } from "@/modules/jobs/service";

export const metadata: Metadata = { title: "Interview" };

export default function InterviewPage({ params }: PageProps<"/interviews/[id]">) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href="/interviews"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Interviews
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <InterviewContent params={params} />
      </Suspense>
    </div>
  );
}

async function InterviewContent({ params }: Pick<PageProps<"/interviews/[id]">, "params">) {
  const user = await requireUser();
  const { id } = await params;
  const detail = /^[0-9a-f-]{36}$/i.test(id) ? await getInterviewDetail(user, id) : null;
  if (!detail) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        This interview doesn&apos;t exist (it may have been deleted).
      </p>
    );
  }
  const { interview: i, bucket, otherRounds, now } = detail;
  const app = i.application;
  const title = `${ROUND_LABEL[i.round]} · ${app.organization.name}`;
  const sections = [
    { title: "Questions asked", body: i.questionsMd, empty: "What did they ask?" },
    { title: "My answers", body: i.myAnswersMd, empty: "How did you answer?" },
    { title: "Lessons learned", body: i.lessonsMd, empty: "What would you do differently?" },
  ];

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Link
              href={`/applications/${app.id}`}
              className="hover:text-foreground hover:underline"
            >
              {app.role}
            </Link>
            <span>Application: {STATUS_LABEL[app.status]}</span>
          </p>
        </div>
        <InterviewActions interview={i} timezone={user.timezone} />
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">When</dt>
              <dd className="font-medium">
                <time dateTime={i.scheduledAt.toISOString()}>
                  {formatWhen(i.scheduledAt, user.timezone)}
                </time>
                <span className="block text-xs font-normal text-muted-foreground">
                  {relativeTime(i.scheduledAt, now)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Outcome</dt>
              <dd>
                <Badge variant={OUTCOME_BADGE[i.outcome]}>{OUTCOME_LABEL[i.outcome]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Length · interviewer</dt>
              <dd className="font-medium">
                {i.durationMin ? `${i.durationMin} min` : "—"}
                {i.interviewer ? ` · ${i.interviewer}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">How it felt</dt>
              <dd className="font-medium">{i.selfRating ? `${i.selfRating} / 5` : "—"}</dd>
            </div>
          </dl>
          {bucket === "needsOutcome" && (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">This has happened — how did it go?</p>
              <OutcomeButtons id={i.id} label={title} />
            </div>
          )}
          {bucket === "upcoming" && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Record the result after the interview.</span>
              <OutcomeButtons id={i.id} label={title} onlyCancel />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="flex flex-col gap-6">
          {sections.map((s) => (
            <Card key={s.title} role="region" aria-label={s.title}>
              <CardHeader>
                <CardTitle>
                  <h2>{s.title}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {s.body.trim() ? (
                  <Markdown>{s.body}</Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">{s.empty} Use Edit to add it.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card role="region" aria-labelledby="rounds-heading">
          <CardHeader>
            <CardTitle>
              <h2 id="rounds-heading">All rounds</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 text-sm">
              {[
                ...otherRounds,
                { id: i.id, round: i.round, scheduledAt: i.scheduledAt, outcome: i.outcome },
              ]
                .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
                .map((r) => (
                  <li key={r.id} className="flex flex-col">
                    {r.id === i.id ? (
                      <span className="font-medium" aria-current="page">
                        {ROUND_LABEL[r.round]}
                      </span>
                    ) : (
                      <Link href={`/interviews/${r.id}`} className="hover:underline">
                        {ROUND_LABEL[r.round]}
                      </Link>
                    )}
                    <span className={cn("text-xs text-muted-foreground")}>
                      {formatWhen(r.scheduledAt, user.timezone)} · {OUTCOME_LABEL[r.outcome]}
                    </span>
                  </li>
                ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
