"use client";

import { Play, Square } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { initialActionState } from "@/lib/action-state";
import { stopTimerAction } from "../actions";

import { Elapsed } from "./elapsed";
import { useActionFeedback } from "./hooks";

type Running = { name: string; color: string; startedAt: Date } | null;

export function HeaderTimerBadge({ running, serverNow }: { running: Running; serverNow: Date }) {
  const [state, action, pending] = useActionState(stopTimerAction, initialActionState);
  useActionFeedback(state);

  if (!running) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/timer">
          <Play />
          {/* Icon-only on the narrowest phones; the name stays for screen readers. */}
          <span className="sr-only sm:not-sr-only">Start timer</span>
        </Link>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-3 text-sm">
      <Link
        href="/timer"
        className="flex items-center gap-2"
        aria-label={`Running: ${running.name}`}
      >
        <span className="relative flex size-2">
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: running.color }}
          />
          <span
            className="relative inline-flex size-2 rounded-full"
            style={{ backgroundColor: running.color }}
          />
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{running.name}</span>
        <span className="font-medium">
          <Elapsed since={running.startedAt} serverNow={serverNow} />
        </span>
      </Link>
      <form action={action}>
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="size-7 rounded-full"
          disabled={pending}
          aria-label="Stop timer"
        >
          <Square className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
