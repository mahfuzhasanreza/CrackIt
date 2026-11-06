import Link from "next/link";

import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: React.ReactNode;
  href: string;
  /** Small count pill after the label (hidden when 0 / undefined). */
  badge?: number;
};

/**
 * Underlined tab links. The baseline is an inset shadow and each tab draws its own underline,
 * so nothing sticks out of the bar: it never scrolls vertically (no stray scrollbar arrows).
 * On narrow screens the row scrolls sideways by swipe, with the scrollbar hidden.
 */
export function TabNav({
  label,
  items,
  current,
}: {
  label: string;
  items: TabItem[];
  current: string;
}) {
  return (
    <nav
      aria-label={label}
      className="no-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-border)]"
    >
      {items.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={current === t.id ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap",
            current === t.id
              ? "border-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.badge ? (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
              {t.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
