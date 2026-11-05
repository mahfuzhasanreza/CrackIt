"use client";

import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

/** Jumps to `<basePath>?date=…` as soon as a date is picked. */
export function TimelineDatePicker({
  value,
  max,
  basePath = "/timeline",
}: {
  value: string;
  max: string;
  basePath?: string;
}) {
  const router = useRouter();
  return (
    <Input
      type="date"
      aria-label="Date"
      className="w-40"
      value={value}
      max={max}
      onChange={(e) => {
        if (e.target.value) router.push(`${basePath}?date=${e.target.value}`);
      }}
    />
  );
}
