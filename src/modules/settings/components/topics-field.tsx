"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { DEFAULT_TRACKS } from "../../tracks-topics/defaults";
import {
  countTopics,
  formatOutline,
  OutlineError,
  parseOutline,
} from "../../tracks-topics/outline";

const PLACEHOLDER = `Data Structures
  Arrays & Hashing
  Trees
    Binary Search Trees
System Design
  Caching`;

function preview(text: string): { count: number; error: string | null } {
  try {
    return { count: countTopics(parseOutline(text)), error: null };
  } catch (e) {
    return {
      count: 0,
      error: e instanceof OutlineError ? e.message : "Couldn't read the outline.",
    };
  }
}

/**
 * The new track's topic roadmap as an indented outline (submitted as `topics`), with a live
 * count and a starter template to begin from.
 */
export function TopicsField({ error }: { error?: string[] }) {
  const [text, setText] = useState("");
  const { count, error: parseError } = preview(text);
  const shownError = parseError ?? error?.[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label htmlFor="track-topics">
          Topics <span className="text-muted-foreground">(optional)</span>
        </Label>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {count > 0 && !parseError ? `${count} ${count === 1 ? "topic" : "topics"}` : ""}
        </span>
      </div>
      <Textarea
        id="track-topics"
        name="topics"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        // No wrapping, so indentation always means nesting; scroll instead of growing.
        wrap="off"
        className="max-h-72 min-h-40 overflow-auto font-mono text-[0.8125rem]"
        aria-invalid={Boolean(shownError)}
        aria-describedby="track-topics-help"
      />
      {shownError ? (
        <p id="track-topics-help" className="text-sm text-destructive">
          {shownError}
        </p>
      ) : (
        <p id="track-topics-help" className="text-xs text-muted-foreground">
          One topic per line; indent with spaces for subtopics (up to 4 levels).
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        Start from:
        {DEFAULT_TRACKS.map((t) => (
          <Button
            key={t.name}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setText(formatOutline(t.topics))}
          >
            {t.name}
          </Button>
        ))}
        {text && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setText("")}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
