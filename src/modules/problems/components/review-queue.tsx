"use client";

import { Check, ExternalLink, RotateCcw } from "lucide-react";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToastAction } from "@/hooks/use-toast-action";

import { reviewProblemAction } from "../actions";
import { PLATFORM_LABEL } from "../labels";
import type { ProblemView } from "../service";

import { DifficultyLabel, formatDay } from "./problems-table";

/** Problems due for revision today (overdue first). */
export function ReviewQueue({ due, today }: { due: ProblemView[]; today: string }) {
  if (due.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to revise today. Solved problems come back the day after.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y">
      {due.map((p) => (
        <ReviewRow key={p.id} problem={p} today={today} />
      ))}
    </ul>
  );
}

function ReviewRow({ problem: p, today }: { problem: ProblemView; today: string }) {
  const [, action, pending] = useToastAction(reviewProblemAction);
  const [, startTransition] = useTransition();
  const review = (outcome: "remembered" | "forgot") =>
    startTransition(() => {
      const fd = new FormData();
      fd.set("id", p.id);
      fd.set("outcome", outcome);
      action(fd);
    });
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          {p.url ? (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              {p.title}
              <ExternalLink className="ml-1 inline size-3 text-muted-foreground" aria-hidden />
            </a>
          ) : (
            <span className="font-medium">{p.title}</span>
          )}
          {p.status === "NEEDS_REVISION" && <Badge>Needs revision</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <DifficultyLabel difficulty={p.difficulty} />
          <span>{PLATFORM_LABEL[p.platform]}</span>
          {p.tags.length > 0 && <span>{p.tags.join(", ")}</span>}
          {p.nextReviewOn && p.nextReviewOn < today && (
            <span>Overdue since {formatDay(p.nextReviewOn)}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => review("remembered")}
          aria-label={`Solved "${p.title}" again`}
        >
          <Check />
          Solved again
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => review("forgot")}
          aria-label={`Couldn't solve "${p.title}"`}
        >
          <RotateCcw />
          Couldn&apos;t
        </Button>
      </div>
    </li>
  );
}
