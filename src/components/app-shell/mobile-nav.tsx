"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { InstallAppButton } from "@/components/pwa/install-app-button";

import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="shrink-0 border-b">
          <SheetTitle asChild>
            <div>
              <Brand />
            </div>
          </SheetTitle>
        </SheetHeader>
        {/* Scrolls only when the menu is taller than the screen (short phones, landscape). */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <InstallAppButton onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
