"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DIFFICULTY_LABEL, PLATFORM_LABEL, STATUS_LABEL } from "../labels";
import type { ProblemFilter } from "../validators";
import { DIFFICULTIES, PLATFORMS, STATUSES } from "../validators";

const ALL = "__all";

/** Search + status/difficulty/pattern/platform filters, kept in the URL. */
export function ProblemFilters({
  filter,
  patterns,
}: {
  filter: ProblemFilter;
  patterns: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filter.q ?? "");

  const go = (next: Partial<ProblemFilter>) => {
    const merged: Record<string, string | undefined> = {
      ...filter,
      q: q.trim() || undefined,
      ...next,
    };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const active = Object.values(filter).some(Boolean);

  const select = <K extends keyof ProblemFilter>(
    key: K,
    label: string,
    allLabel: string,
    options: readonly string[],
    labels: Record<string, string>,
    width: string,
  ) => (
    <Select
      value={(filter[key] as string | undefined) ?? ALL}
      onValueChange={(v) => go({ [key]: v === ALL ? undefined : v } as Partial<ProblemFilter>)}
    >
      <SelectTrigger aria-label={label} className={width}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        role="search"
        className="flex min-w-56 flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go({});
        }}
      >
        <Input
          type="search"
          aria-label="Search problems"
          placeholder="Search titles…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Search">
          <Search />
        </Button>
      </form>
      {select("status", "Status filter", "Any status", STATUSES, STATUS_LABEL, "w-40")}
      {select(
        "difficulty",
        "Difficulty filter",
        "Any difficulty",
        DIFFICULTIES,
        DIFFICULTY_LABEL,
        "w-36",
      )}
      {select(
        "tag",
        "Pattern filter",
        "Any pattern",
        patterns,
        Object.fromEntries(patterns.map((p) => [p, p])),
        "w-44",
      )}
      {select("platform", "Platform filter", "Any platform", PLATFORMS, PLATFORM_LABEL, "w-40")}
      {active && (
        <Button asChild variant="ghost" size="sm">
          <Link href={pathname}>Clear</Link>
        </Button>
      )}
    </div>
  );
}
