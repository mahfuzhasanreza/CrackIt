import { cookies } from "next/headers";

import { getCurrentUser } from "../dal";
import { guestTimeRemaining } from "../guest";
import { GUEST_BANNER_COOKIE } from "../guest-rules";

import { GuestBannerView } from "./guest-banner-view";

/** Shown on every page to guests. Server Component: render inside <Suspense>. */
export async function GuestBanner() {
  const user = await getCurrentUser();
  const timeLeft = user && (await guestTimeRemaining(user));
  if (!timeLeft) return null;

  // Read on the server so a closed notice never flashes back on navigation.
  if ((await cookies()).get(GUEST_BANNER_COOKIE)?.value === "1") return null;
  return <GuestBannerView timeLeft={timeLeft} />;
}
