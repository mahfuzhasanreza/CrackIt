"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityCategory } from "@/generated/prisma/enums";

import type { EntryOptions } from "../options";

const NONE = "__none";

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  STUDY: "Study",
  SLEEP: "Sleep",
  BREAK: "Breaks",
  WORK: "Work",
  EXERCISE: "Exercise",
  PERSONAL: "Personal",
  OTHER: "Other",
};

export type RefValues = { activityTypeId: string; trackId: string; topicId: string };

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.[0] ? (
    <p id={id} className="text-sm text-destructive">
      {errors[0]}
    </p>
  ) : null;
}

/**
 * Activity → Track → Topic pickers. Values are submitted through hidden inputs named
 * activityTypeId / trackId / topicId. Picking a topic implies its track.
 */
export function RefPickers({
  options,
  defaults,
  fieldErrors,
  idPrefix,
}: {
  options: EntryOptions;
  defaults?: Partial<RefValues>;
  fieldErrors?: Record<string, string[] | undefined>;
  idPrefix: string;
}) {
  const [activityTypeId, setActivity] = useState(defaults?.activityTypeId ?? "");
  const [trackId, setTrack] = useState(defaults?.trackId ?? "");
  const [topicId, setTopic] = useState(defaults?.topicId ?? "");

  const activity = options.activities.find((a) => a.id === activityTypeId);
  const track = options.tracks.find((t) => t.id === trackId);
  const isStudy = activity?.category === "STUDY";

  const groups = Object.entries(Object.groupBy(options.activities, (a) => a.category)) as [
    ActivityCategory,
    EntryOptions["activities"],
  ][];

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.4fr]">
      <input type="hidden" name="activityTypeId" value={activityTypeId} />
      <input type="hidden" name="trackId" value={trackId} />
      <input type="hidden" name="topicId" value={topicId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-activity`}>Activity</Label>
        <Select value={activityTypeId} onValueChange={setActivity}>
          <SelectTrigger
            id={`${idPrefix}-activity`}
            className="w-full"
            aria-invalid={Boolean(fieldErrors?.activityTypeId)}
          >
            <SelectValue placeholder="What are you doing?" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(([category, items]) => (
              <SelectGroup key={category}>
                <SelectLabel>{CATEGORY_LABEL[category]}</SelectLabel>
                {items.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <FieldError id={`${idPrefix}-activity-error`} errors={fieldErrors?.activityTypeId} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-track`}>
          Track {isStudy ? "" : <span className="text-muted-foreground">(optional)</span>}
        </Label>
        <Select
          value={trackId || NONE}
          onValueChange={(v) => {
            setTrack(v === NONE ? "" : v);
            setTopic("");
          }}
        >
          <SelectTrigger
            id={`${idPrefix}-track`}
            className="w-full"
            aria-invalid={Boolean(fieldErrors?.trackId)}
          >
            <SelectValue placeholder="Track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No track</SelectItem>
            {options.tracks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id={`${idPrefix}-track-error`} errors={fieldErrors?.trackId} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-topic`}>
          Topic <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Select
          value={topicId || NONE}
          onValueChange={(v) => setTopic(v === NONE ? "" : v)}
          disabled={!track}
        >
          <SelectTrigger
            id={`${idPrefix}-topic`}
            className="w-full"
            aria-invalid={Boolean(fieldErrors?.topicId)}
          >
            <SelectValue placeholder={track ? "Topic" : "Pick a track first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No topic</SelectItem>
            {track?.topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span style={{ paddingLeft: `${t.depth * 0.75}rem` }}>
                  {t.label.split(" › ").at(-1)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id={`${idPrefix}-topic-error`} errors={fieldErrors?.topicId} />
      </div>
    </div>
  );
}
