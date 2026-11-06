"use client";

import { Check } from "lucide-react";

import { NEUTRAL, SERIES, seriesVars } from "@/lib/palette";
import { cn } from "@/lib/utils";

const NAMES: Record<string, string> = Object.fromEntries([
  ...SERIES.map((s) => [s.light, s.name]),
  [NEUTRAL.light, "gray"],
]);

/**
 * Swatches from the validated chart palette (so charts stay legible), plus the current color
 * when it's a custom one from before. Submitted as `name`.
 */
export function ColorChoice({
  name,
  value,
  onChange,
  includeNeutral = false,
  legend = "Color",
}: {
  name: string;
  value: string;
  onChange: (hex: string) => void;
  includeNeutral?: boolean;
  legend?: string;
}) {
  const options: string[] = [
    ...SERIES.map((s) => s.light),
    ...(includeNeutral ? [NEUTRAL.light] : []),
  ];
  if (!options.includes(value.toLowerCase())) options.push(value.toLowerCase());

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={legend}>
        {options.map((hex) => {
          const selected = hex === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={NAMES[hex] ?? `Custom ${hex}`}
              onClick={() => onChange(hex)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full bg-series ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected && "ring-2 ring-foreground",
              )}
              style={seriesVars(hex)}
            >
              {selected && <Check className="size-4 text-white" aria-hidden />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
