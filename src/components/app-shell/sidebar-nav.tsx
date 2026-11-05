"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { NAV_GROUPS } from "./navigation";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-5 px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map(({ title, href, icon: Icon, ready }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const classes = cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
              active ? "bg-accent font-medium text-accent-foreground" : "text-foreground/80",
              ready ? "hover:bg-accent hover:text-accent-foreground" : "cursor-default opacity-50",
            );
            return ready ? (
              <Link
                key={href}
                href={href}
                className={classes}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                <Icon className="size-4" aria-hidden />
                {title}
              </Link>
            ) : (
              <span key={href} className={classes} aria-disabled>
                <Icon className="size-4" aria-hidden />
                {title}
                <span className="ml-auto text-[10px] text-muted-foreground">soon</span>
              </span>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
