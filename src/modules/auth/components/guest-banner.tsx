import { Info } from "lucide-react";

import { leaveGuestToRegisterAction } from "../actions";
import { getCurrentUser } from "../dal";
import { guestTimeRemaining } from "../guest";

/** Shown on every page to guests. Server Component: render inside <Suspense>. */
export async function GuestBanner() {
  const user = await getCurrentUser();
  const timeLeft = user && (await guestTimeRemaining(user));
  if (!timeLeft) return null;

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
    </div>
  );
}
