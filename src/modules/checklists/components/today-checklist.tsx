import Link from "next/link";

import type { TodayItem } from "../service";

import { ItemRow } from "./item-row";

/** Dashboard list: today's habits and what's due. Ticks right here. */
export function TodayChecklist({ habits, due }: { habits: TodayItem[]; due: TodayItem[] }) {
  if (habits.length === 0 && due.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing due today.{" "}
        <Link href="/checklists" className="font-medium underline underline-offset-4">
          Add a habit
        </Link>{" "}
        to build a daily routine.
      </p>
    );
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Group title="Habits" items={habits} empty="No habits yet." />
      <Group title="Due" items={due} empty="Nothing due or overdue." />
    </div>
  );
}

function Group({ title, items, empty }: { title: string; items: TodayItem[]; empty: string }) {
  const done = items.filter((i) => i.done).length;
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <h3 className="flex items-baseline justify-between text-sm font-medium">
        {title}
        {items.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {done}/{items.length}
          </span>
        )}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((i) => (
            <ItemRow
              key={i.id}
              item={i}
              context={`${i.checklistTitle}${i.recurrence === "WEEKLY" ? " · this week" : ""}`}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
