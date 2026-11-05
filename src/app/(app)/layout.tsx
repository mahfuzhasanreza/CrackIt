import { Suspense } from "react";

import { Brand } from "@/components/app-shell/brand";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/modules/auth/components/user-menu";
import { HeaderTimer } from "@/modules/time-tracking/components/header-timer";

/**
 * Shell for every signed-in page. Static on purpose: the session is read only inside
 * <Suspense> boundaries (user menu, page content) so the shell prerenders instantly.
 * Access control: proxy.ts (optimistic) + requireUser() in each page/action (authoritative).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh">
      {/* Fixed (not sticky) so it never scrolls away, whatever the page or an open dialog
          does to <body>'s overflow. The content column is offset by the same w-60. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 shrink-0 items-center border-b px-5">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-col md:pl-60">
        {/* Same h-14 + border-b as the sidebar's brand row, so the two lines up. */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <MobileNav />
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="flex-1" />
          <Suspense fallback={<Skeleton className="h-8 w-28 rounded-full" />}>
            <HeaderTimer />
          </Suspense>
          <ThemeToggle />
          <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
            <UserMenu />
          </Suspense>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
