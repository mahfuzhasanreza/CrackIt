"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

import { NAV_GROUPS } from "./navigation";

type Props = { onNavigate?: () => void };

/**
 * Main navigation. The pathname (for the active highlight) is read in a small leaf inside
 * <Suspense>: on routes with dynamic params it's only known at request time, and with Cache
 * Components an unwrapped read would fail the build. The fallback is the same list, unhighlighted.
 */
export function SidebarNav(props: Props) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <ActiveNav {...props} />
    </Suspense>
  );
}

function ActiveNav(props: Props) {
  return <NavList {...props} pathname={usePathname()} />;
}

function NavList({ onNavigate, pathname }: Props & { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5 px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map(({ title, href, icon: Icon, ready }) => {
            const active =
              pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
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
