"use client";

import { formatStopwatch } from "@/lib/dates";

import { useNow } from "./hooks";

export function Elapsed({ since, serverNow }: { since: Date; serverNow: Date }) {
  const now = useNow(serverNow);
  return (
    <time dateTime={since.toISOString()} className="tabular-nums" suppressHydrationWarning>
      {formatStopwatch(now.getTime() - since.getTime())}
    </time>
  );
}
