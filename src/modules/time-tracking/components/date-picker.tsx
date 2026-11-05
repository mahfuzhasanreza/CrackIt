"use client";

import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

/** Jumps to /timeline?date=… as soon as a date is picked. */
export function TimelineDatePicker({ value, max }: { value: string; max: string }) {
  const router = useRouter();
  return (
    <Input
      type="date"
      aria-label="Date"
      className="w-40"
      value={value}
      max={max}
      onChange={(e) => {
        if (e.target.value) router.push(`/timeline?date=${e.target.value}`);
      }}
    />
  );
}
