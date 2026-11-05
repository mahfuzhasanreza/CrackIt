import { connection } from "next/server";

/** Liveness check used by CI smoke tests and deploy verification. */
export async function GET() {
  await connection(); // always evaluate at request time, never prerender
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
