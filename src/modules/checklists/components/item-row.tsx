"use client";

import { Check, Flame } from "lucide-react";
import { useOptimistic, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { useToastAction } from "@/hooks/use-toast-action";
import { cn } from "@/lib/utils";

import { toggleItemAction } from "../actions";
import type { ItemView } from "../service";

export const PRIORITY_LABEL = ["Normal", "High", "Urgent"] as const;

export function formatDay(key: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
}

/** Checkbox + title + meta (priority, due date, habit streak and history). */
export function ItemRow({
  item,
  context,
  actions,
}: {
  item: ItemView;
  /** Extra line under the title, e.g. the checklist name on the dashboard. */
  context?: string;
  actions?: React.ReactNode;
}) {
  const [done, setDone] = useOptimistic(item.done);
  const [, dispatch] = useToastAction(toggleItemAction);
  const [, startTransition] = useTransition();
  const toggle = (next: boolean) =>
    startTransition(() => {
      setDone(next);
      const fd = new FormData();
      fd.set("id", item.id);
      fd.set("done", String(next));
      dispatch(fd);
    });

  return (
    <li className="flex items-start gap-3 py-2">
      <input
        type="checkbox"
        id={`item-${item.id}`}
        checked={done}
        onChange={(e) => toggle(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label
          htmlFor={`item-${item.id}`}
          className={cn("text-sm leading-snug", done && "text-muted-foreground line-through")}
        >
          {item.title}
        </label>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {context && <span>{context}</span>}
          {item.priority > 0 && (
            <Badge
              variant={item.priority === 2 ? "destructive" : "secondary"}
              className="px-1.5 py-0"
            >
              {PRIORITY_LABEL[item.priority]}
            </Badge>
          )}
          {item.dueOn && (
            <span className={cn(item.due === "overdue" && "font-medium text-destructive")}>
              {item.due === "overdue"
                ? "Overdue · "
                : item.due === "today"
                  ? "Due today · "
                  : "Due "}
              {formatDay(item.dueOn)}
            </span>
          )}
          {item.habit && <HabitMeta habit={item.habit} />}
        </div>
      </div>
      {actions}
    </li>
  );
}

function HabitMeta({ habit }: { habit: NonNullable<ItemView["habit"]> }) {
  const doneCount = habit.history.filter((h) => h.done).length;
  return (
    <>
      <span className="flex items-center gap-1" title={`Best streak: ${habit.streak.best}`}>
        <Flame className="size-3.5" aria-hidden />
        <span className="tabular-nums">{habit.streak.current}</span>
        <span className="sr-only">current streak, best {habit.streak.best}</span>
      </span>
      <span
        role="img"
        className="flex items-center gap-0.5"
        aria-label={`Done ${doneCount} of the last ${habit.history.length}`}
      >
        {habit.history.map((h) => (
          <span
            key={h.period}
            title={`${formatDay(h.period)}: ${h.done ? "done" : "not done"}`}
            className={cn(
              "flex size-3 items-center justify-center rounded-full border border-foreground/40",
              h.done && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {h.done && <Check className="size-2" strokeWidth={4} aria-hidden />}
          </span>
        ))}
      </span>
    </>
  );
}
