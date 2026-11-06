"use client";

import { LoaderCircle, Plus, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToastAction } from "@/hooks/use-toast-action";
import { seriesVars } from "@/lib/palette";

import { DEFAULT_TRACKS } from "../../tracks-topics/defaults";
import { countTopics } from "../../tracks-topics/outline";
import { addTemplateTrackAction } from "../actions";

/**
 * First-run card for an account with no tracks: tracks are the user's own targets, with the
 * starter roadmaps offered as optional templates.
 */
export function TrackSetup({ existing = [] }: { existing?: string[] }) {
  const [, action, pending] = useToastAction(addTemplateTrackAction);
  const [adding, setAdding] = useState<string | null>(null);
  const templates = DEFAULT_TRACKS.filter((t) => !existing.includes(t.name));

  return (
    <Card role="region" aria-labelledby="track-setup-heading">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="size-4" aria-hidden />
          <h2 id="track-setup-heading">What are you preparing for?</h2>
        </CardTitle>
        <CardDescription>
          A track is a target — a role, an exam, a skill. Study time, topics, goals and analytics
          are organised by track. Create your own, or start from a template and edit it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button asChild className="w-fit">
          <Link href="/settings?tab=tracks&add=1">
            <Plus />
            Create my own track
          </Link>
        </Button>
        {templates.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Or start from a template:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <li key={t.name}>
                  <form
                    action={(fd) => {
                      setAdding(t.name);
                      action(fd);
                    }}
                  >
                    <input type="hidden" name="name" value={t.name} />
                    <button
                      type="submit"
                      disabled={pending}
                      aria-label={`Use the ${t.name} template`}
                      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      <span
                        aria-hidden
                        className="mt-1 size-3 shrink-0 rounded-full bg-series"
                        style={seriesVars(t.color)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-2 font-medium">
                          {t.name}
                          {pending && adding === t.name && (
                            <LoaderCircle className="size-4 animate-spin" aria-hidden />
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.description} · {countTopics(t.topics)} topics ·{" "}
                          {t.weeklyTargetMinutes / 60}h a week
                        </span>
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
