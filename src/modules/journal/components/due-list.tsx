import Link from "next/link";

import type { LearningEntryView } from "../service";

import { revisitLabel } from "./learning-entry-card";
import { ReviewButtons } from "./review-buttons";

/** Compact revision queue: overdue first. */
export function DueList({
  due,
  dueCount,
  today,
}: {
  due: LearningEntryView[];
  dueCount: number;
  today: string;
}) {
  if (due.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to revise today. New entries come back the day after you log them.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y">
        {due.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-0.5">
              <Link
                href={`/journal?date=${e.dateKey}#entry-${e.id}`}
                className="text-sm font-medium hover:underline"
              >
                {e.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {e.track?.name ? `${e.track.name} · ` : ""}
                {revisitLabel(e, today)}
              </span>
            </div>
            <ReviewButtons id={e.id} title={e.title} />
          </li>
        ))}
      </ul>
      {dueCount > due.length && (
        <Link href="/journal/learning?due=1" className="text-sm font-medium hover:underline">
          See all {dueCount} due
        </Link>
      )}
    </div>
  );
}
