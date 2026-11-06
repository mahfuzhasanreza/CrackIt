import { z } from "zod";

import { getCurrentUser } from "@/modules/auth/dal";
import { stopTimer } from "@/modules/time-tracking/service";

const body = z.object({ entryId: z.uuid() });

/**
 * Stop the running timer from the phone notification's "Stop" button (called by the
 * service worker, which can't use Server Actions). Only stops the entry the notification
 * was shown for, so a stale notification can't end a timer started later on another device.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  // Same-origin JSON only (a cross-site form can't send application/json without CORS).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Send JSON." }, { status: 415 });
  }

  let parsed: z.infer<typeof body>;
  try {
    parsed = body.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await stopTimer(user.id, { entryId: parsed.entryId });
  if (result.ok) return Response.json({ stopped: true });
  const status = result.error.code === "CONFLICT" || result.error.code === "NOT_FOUND" ? 409 : 500;
  return Response.json({ stopped: false, error: result.error.message }, { status });
}
