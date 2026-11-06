"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { FormField } from "@/components/form-field";
import { RatingInput } from "@/components/rating-input";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceStatus, ResourceType } from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import { deleteResourceAction, logProgressAction, saveResourceAction } from "../actions";
import { STATUS_LABEL, TYPE_LABEL } from "../labels";
import { RESOURCE_STATUSES, RESOURCE_TYPES, unitLabelFor } from "../rules";
import type { ResourceView } from "../service";

export type TrackChoice = { id: string; name: string; color: string };

const NONE = "none";
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function EnumSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  labels,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <FormField id={id} label={label}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {labels[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export function ResourceForm({
  resource,
  tracks,
  onDone,
}: {
  resource?: ResourceView;
  tracks: TrackChoice[];
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveResourceAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [type, setType] = useState<ResourceType>(resource?.type ?? "BOOK");
  const [status, setStatus] = useState<ResourceStatus>(resource?.status ?? "PLANNED");
  const [trackId, setTrackId] = useState(resource?.track?.id ?? "");
  const err = state.fieldErrors;
  const finished = status === "DONE" || status === "DROPPED";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{resource ? "Edit resource" : "Add resource"}</DialogTitle>
        <DialogDescription>
          Progress is counted in units: chapters, lessons, videos, problems…
        </DialogDescription>
      </DialogHeader>
      {resource && <input type="hidden" name="id" value={resource.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="trackId" value={trackId} />

      <FormField id="resource-title" label="Title" error={err?.title}>
        <Input
          id="resource-title"
          name="title"
          required
          maxLength={200}
          defaultValue={resource?.title ?? ""}
          aria-invalid={Boolean(err?.title)}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="resource-author" label="Author / instructor" optional error={err?.author}>
          <Input
            id="resource-author"
            name="author"
            maxLength={120}
            defaultValue={resource?.author ?? ""}
          />
        </FormField>
        <EnumSelect
          id="resource-type"
          label="Type"
          value={type}
          onChange={setType}
          options={RESOURCE_TYPES}
          labels={TYPE_LABEL}
        />
      </div>
      <FormField id="resource-url" label="Link" optional error={err?.url}>
        <Input
          id="resource-url"
          name="url"
          type="url"
          placeholder="https://…"
          defaultValue={resource?.url ?? ""}
          aria-invalid={Boolean(err?.url)}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="resource-done" label="Done so far" error={err?.completedUnits}>
          <Input
            id="resource-done"
            name="completedUnits"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={resource?.completedUnits ?? 0}
            aria-invalid={Boolean(err?.completedUnits)}
          />
        </FormField>
        <FormField id="resource-total" label="Total" optional error={err?.totalUnits}>
          <Input
            id="resource-total"
            name="totalUnits"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={resource?.totalUnits ?? ""}
            aria-invalid={Boolean(err?.totalUnits)}
          />
        </FormField>
        <FormField id="resource-unit" label="Unit" optional error={err?.unitLabel}>
          <Input
            id="resource-unit"
            name="unitLabel"
            maxLength={30}
            placeholder={unitLabelFor(type, null)}
            defaultValue={resource?.unitLabel ?? ""}
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <EnumSelect
          id="resource-status"
          label="Status"
          value={status}
          onChange={setStatus}
          options={RESOURCE_STATUSES}
          labels={STATUS_LABEL}
        />
        <FormField id="resource-track" label="Track" optional>
          <Select value={trackId || NONE} onValueChange={(v) => setTrackId(v === NONE ? "" : v)}>
            <SelectTrigger id="resource-track" className="w-full">
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
        </FormField>
      </div>
      {finished && (
        <RatingInput
          name="rating"
          legend="Worth it?"
          labels={["", "Waste of time", "Meh", "Okay", "Good", "Must-read"]}
          defaultValue={resource?.rating}
          idPrefix="resource"
        />
      )}
      <FormField id="resource-notes" label="Notes (Markdown)" optional error={err?.notesMd}>
        <Textarea
          id="resource-notes"
          name="notesMd"
          rows={5}
          defaultValue={resource?.notesMd ?? ""}
          placeholder={"- Key takeaways\n- Chapters worth re-reading"}
          className="font-mono text-[0.8125rem]"
        />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProgressForm({ resource, onDone }: { resource: ResourceView; onDone: () => void }) {
  const [state, action, pending] = useToastAction(logProgressAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const err = state.fieldErrors?.completed;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Log progress</DialogTitle>
        <DialogDescription>{resource.title}</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={resource.id} />
      <FormField
        id="progress-completed"
        label={`${capitalize(resource.unit)} done${resource.totalUnits ? ` (of ${resource.totalUnits})` : ""}`}
        error={err}
      >
        <Input
          id="progress-completed"
          name="completed"
          type="number"
          inputMode="numeric"
          min={0}
          max={resource.totalUnits ?? undefined}
          required
          autoFocus
          defaultValue={resource.completedUnits}
          aria-invalid={Boolean(err)}
        />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteResource({
  resource,
  onDone,
}: {
  resource: ResourceView;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(deleteResourceAction, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete “{resource.title}”?</DialogTitle>
        <DialogDescription>
          Its progress and notes go too. This can&apos;t be undone.
        </DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={resource.id} />
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Delete
        </Button>
      </DialogFooter>
    </form>
  );
}
