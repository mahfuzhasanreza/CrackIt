"use client";

import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";

import { leaveGuestToRegisterAction } from "../actions";
import { GUEST_BANNER_COOKIE } from "../guest-rules";

function remember(minimized: boolean) {
  // A guest account lives 24 hours at most, so the cookie never needs to outlive it.
  document.cookie = minimized
    ? `${GUEST_BANNER_COOKIE}=1; path=/; max-age=86400; samesite=lax`
    : `${GUEST_BANNER_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** The guest notice, full or minimized to one short line. */
export function GuestBannerView({
  timeLeft,
  initiallyMinimized,
}: {
  timeLeft: string;
  initiallyMinimized: boolean;
}) {
  const [minimized, setMinimized] = useState(initiallyMinimized);
  const toggle = () => {
    remember(!minimized);
    setMinimized(!minimized);
  };

  if (minimized) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 border-b bg-muted px-4 py-1 text-xs text-muted-foreground md:px-8"
      >
        <Info className="size-3.5 shrink-0" aria-hidden />
        <p className="flex-1">Guest account · deleted {timeLeft}</p>
        <button
          type="button"
          onClick={toggle}
          aria-label="Show guest account notice"
          className="rounded p-1 hover:bg-background hover:text-foreground"
        >
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted px-4 py-2 text-sm md:px-8"
    >
      <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="flex-1">
        You&apos;re exploring a <strong>guest account</strong> with demo data. Change anything you
        like: it&apos;s deleted {timeLeft}.
      </p>
      <form action={leaveGuestToRegisterAction}>
        <button
          type="submit"
          className="font-medium underline underline-offset-2 hover:text-foreground"
        >
          Create your own account
        </button>
      </form>
      <button
        type="button"
        onClick={toggle}
        aria-label="Minimize guest account notice"
        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <ChevronUp className="size-4" aria-hidden />
      </button>
    </div>
  );
}
