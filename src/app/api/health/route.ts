import { connection } from "next/server";

import { db } from "@/lib/db";

/** Liveness + DB check used by CI smoke tests and deploy verification. */
export async function GET() {
  await connection(); // always evaluate at request time, never prerender
  const time = new Date().toISOString();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up", time });
  } catch {
    return Response.json({ status: "error", db: "down", time }, { status: 503 });
  }
}
