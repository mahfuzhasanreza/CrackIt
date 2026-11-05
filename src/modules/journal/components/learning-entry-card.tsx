import { CalendarClock, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";

import type { TrackOption } from "../../tracks-topics/repository";
import type { LearningEntryView } from "../service";
import { isDue, REVIEW_INTERVALS_DAYS } from "@/lib/spaced-repetition";

import { LearningEntryButton } from "./learning-entry-dialog";
import { ReviewButtons } from "./review-buttons";

export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...opts,
  }).format(new Date(`${key}T00:00:00Z`));
}

export function revisitLabel(entry: LearningEntryView, today: string): string {
  if (!entry.revisitOn) {
    return entry.reviewStage >= REVIEW_INTERVALS_DAYS.length ? "Mastered" : "No revisions";
  }
  if (entry.revisitOn < today) return `Revision overdue since ${formatDateKey(entry.revisitOn)}`;
  if (entry.revisitOn === today) return "Revise today";
  return `Next revision ${formatDateKey(entry.revisitOn)}`;
}

/** A learning entry with its rendered notes. */
export function LearningEntryCard({
  entry,
  tracks,
  today,
  showDate = false,
}: {
  entry: LearningEntryView;
  tracks: TrackOption[];
  today: string;
  showDate?: boolean;
}) {
  return (
    <article
      id={`entry-${entry.id}`}
      aria-labelledby={`entry-${entry.id}-title`}
      className="flex scroll-mt-20 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`entry-${entry.id}-title`} className="leading-snug font-semibold">
            {entry.title}
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {showDate && (
              <Link href={`/journal?date=${entry.dateKey}`} className="hover:underline">
                {formatDateKey(entry.dateKey, { weekday: "short", year: "numeric" })}
              </Link>
            )}
            {entry.track && (
              <span className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.track.color }}
                />
                {entry.track.name}
                {entry.topic && <> › {entry.topic.name}</>}
              </span>
            )}
            {entry.confidence && <span>Confidence {entry.confidence}/5</span>}
          </p>
        </div>
        <LearningEntryButton target={{ mode: "edit", entry }} tracks={tracks} today={today} />
      </header>

      {entry.contentMd.trim() && <Markdown>{entry.contentMd}</Markdown>}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="secondary" asChild>
              <Link href={`/journal/learning?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>
            </Badge>
          ))}
          {entry.sourceUrl && (
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {new URL(entry.sourceUrl).hostname}
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
            {revisitLabel(entry, today)}
          </span>
          {isDue(entry.revisitOn, today) && <ReviewButtons id={entry.id} title={entry.title} />}
        </div>
      </footer>
    </article>
  );
}
