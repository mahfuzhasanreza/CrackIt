"use client";

import { cn } from "@/lib/utils";

const LABELS = ["", "Distracted", "Scattered", "Okay", "Focused", "Deep focus"];

/** 1–5 radio group submitted as `focusRating`. */
export function FocusRating({
  defaultValue,
  idPrefix,
}: {
  defaultValue?: number | null;
  idPrefix: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">
        Focus <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} title={LABELS[n]} className="cursor-pointer">
            <input
              type="radio"
              name="focusRating"
              value={n}
              defaultChecked={defaultValue === n}
              id={`${idPrefix}-focus-${n}`}
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
