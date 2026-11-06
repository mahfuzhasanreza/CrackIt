import { getCurrentUser } from "@/modules/auth/dal";
import { exportBackup, importBackup } from "@/modules/backup/service";

const MAX_BYTES = 25 * 1024 * 1024;

/** Download everything as one JSON file. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const backup = await exportBackup(user.id);
  const day = backup.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="crackit-backup-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Replace all of the signed-in user's data with an uploaded backup. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  // Same-origin JSON only (a cross-site form can't send application/json without CORS).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Send the backup as JSON." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return Response.json({ error: "That file is too big (25 MB max)." }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(await request.text());
  } catch {
    return Response.json({ error: "That file isn't valid JSON." }, { status: 400 });
  }
  const result = await importBackup(user.id, json);
  return result.ok
    ? Response.json({ counts: result.data.counts })
    : Response.json({ error: result.error.message }, { status: 422 });
}
