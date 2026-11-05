"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type TrackChoice = { id: string; name: string; color: string };

const NONE = "__none";

/** Title, description and track: shared by the create and edit dialogs. */
export function ChecklistFormFields({
  tracks,
  fieldErrors,
  defaults,
}: {
  tracks: TrackChoice[];
  fieldErrors?: Record<string, string[] | undefined>;
  defaults?: { title?: string; description?: string; trackId?: string };
}) {
  const [trackId, setTrackId] = useState(defaults?.trackId ?? "");
  return (
    <>
      <input type="hidden" name="trackId" value={trackId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="checklist-title">Title</Label>
        <Input
          id="checklist-title"
          name="title"
          required
          maxLength={200}
          defaultValue={defaults?.title ?? ""}
          aria-invalid={Boolean(fieldErrors?.title)}
        />
        {fieldErrors?.title && <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="checklist-description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="checklist-description"
          name="description"
          rows={2}
          maxLength={1000}
          defaultValue={defaults?.description ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="checklist-track">
          Track <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Select value={trackId || NONE} onValueChange={(v) => setTrackId(v === NONE ? "" : v)}>
          <SelectTrigger id="checklist-track" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No track</SelectItem>
            {tracks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors?.trackId && (
          <p className="text-sm text-destructive">{fieldErrors.trackId[0]}</p>
        )}
      </div>
    </>
  );
}
