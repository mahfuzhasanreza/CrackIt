"use client";

import { cn } from "@/lib/utils";

/** 1–5 radio group submitted under `name`. `labels[n]` is the tooltip for value n. */
export function RatingInput({
  name,
  legend,
  labels,
  defaultValue,
  idPrefix,
  optional = true,
}: {
  name: string;
  legend: string;
  labels?: readonly string[];
  defaultValue?: number | null;
  idPrefix: string;
  optional?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">
        {legend} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} title={labels?.[n]} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              defaultChecked={defaultValue === n}
              id={`${idPrefix}-${name}-${n}`}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-md border text-sm tabular-nums",
                "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
              )}
            >
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
