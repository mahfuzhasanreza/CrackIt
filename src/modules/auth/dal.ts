import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";

import { findSessionUserById } from "./repository";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  dayStartHour: number;
};

/**
 * Data Access Layer entry point: the signed-in user, or null.
 * Verifies the JWT *and* that the user still exists with the same session version
 * (so a password reset logs out every other session). Deduplicated per request.
 * Reads cookies → callers must render inside <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await findSessionUserById(id);
  if (!user || user.sessionVersion !== session.user.sessionVersion) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    dayStartHour: user.dayStartHour,
  };
});

/** Use in pages, Server Actions and Route Handlers that need a signed-in user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
