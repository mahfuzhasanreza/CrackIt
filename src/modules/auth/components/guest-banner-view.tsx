"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";

import { leaveGuestToRegisterAction } from "../actions";
import { GUEST_BANNER_COOKIE } from "../guest-rules";

/** The guest notice; the guest can close it for good (a guest account lives 24 hours at most). */
export function GuestBannerView({ timeLeft }: { timeLeft: string }) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  const close = () => {
    document.cookie = `${GUEST_BANNER_COOKIE}=1; path=/; max-age=86400; samesite=lax`;
    setClosed(true);
  };

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
        onClick={close}
        aria-label="Close guest account notice"
        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
