"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ACTIONS, createMatcher, GO_TO, isTypingTarget } from "./keymap";

/** Other components can open the help dialog (e.g. the account menu). */
export const OPEN_SHORTCUTS_EVENT = "crackit:shortcuts";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs">
      {children}
    </kbd>
  );
}

/**
 * Global shortcuts for the signed-in app: "g" + letter to navigate, "s" for the timer,
 * "?" for help. Ignored while typing, with modifier keys, or when a dialog/menu is open.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const matcher = useRef(createMatcher());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) return;

      const command = matcher.current(e.key, e.timeStamp);
      if (!command) return;
      e.preventDefault();
      if (command.type === "help") setOpen(true);
      else if (command.type === "navigate") router.push(command.href);
      else {
        const stop = document.querySelector<HTMLButtonElement>(
          'header button[aria-label="Stop timer"]',
        );
        if (stop && !stop.disabled) stop.click();
        else router.push("/timer");
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    };
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>They work anywhere except while you&apos;re typing.</DialogDescription>
        </DialogHeader>
        <section aria-labelledby="shortcuts-actions" className="flex flex-col gap-2">
          <h3 id="shortcuts-actions" className="text-sm font-medium">
            Actions
          </h3>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
            {ACTIONS.map((a) => (
              <div key={a.label} className="contents">
                <dt>
                  {a.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </dt>
                <dd className="text-muted-foreground">{a.label}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="shortcuts-go" className="flex flex-col gap-2">
          <h3 id="shortcuts-go" className="text-sm font-medium">
            Go to
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {GO_TO.map((g) => (
              <div key={g.key} className="flex items-center gap-2">
                <dt className="flex gap-1">
                  <Kbd>g</Kbd>
                  <Kbd>{g.key}</Kbd>
                </dt>
                <dd className="text-muted-foreground">{g.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </DialogContent>
    </Dialog>
  );
}
