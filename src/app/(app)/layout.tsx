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
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
        <div className="sticky top-0 flex h-svh flex-col overflow-y-auto">
          <div className="flex h-14 shrink-0 items-center border-b px-5">
            <Brand />
          </div>
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
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
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
