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

const ALL = "__all";

type Filter = { q?: string; tag?: string; track?: string; due: boolean };

/** Search box + tag/track/due filters, all kept in the URL. */
export function LearningFilters({
  filter,
  tags,
  tracks,
}: {
  filter: Filter;
  tags: string[];
  tracks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filter.q ?? "");

  const go = (next: Partial<Filter>) => {
    const merged = { ...filter, q: q.trim() || undefined, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.tag) params.set("tag", merged.tag);
    if (merged.track) params.set("track", merged.track);
    if (merged.due) params.set("due", "1");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const active = Boolean(filter.q || filter.tag || filter.track || filter.due);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <form
        role="search"
        className="flex min-w-60 flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go({});
        }}
      >
        <Input
          type="search"
          aria-label="Search notes"
          placeholder="Search titles and notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Search">
          <Search />
        </Button>
      </form>
      <Select
        value={filter.tag ?? ALL}
        onValueChange={(v) => go({ tag: v === ALL ? undefined : v })}
      >
        <SelectTrigger aria-label="Tag" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tags</SelectItem>
          {tags.map((t) => (
            <SelectItem key={t} value={t}>
              #{t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.track ?? ALL}
        onValueChange={(v) => go({ track: v === ALL ? undefined : v })}
      >
        <SelectTrigger aria-label="Track filter" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tracks</SelectItem>
          {tracks.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex h-9 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filter.due}
          onChange={(e) => go({ due: e.target.checked })}
          className="size-4 accent-primary"
        />
        Due for revision
      </label>
      {active && (
        <Button asChild variant="ghost" size="sm">
          <Link href={pathname}>Clear</Link>
        </Button>
      )}
    </div>
  );
}
