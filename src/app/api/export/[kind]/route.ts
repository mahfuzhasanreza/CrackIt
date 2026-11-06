import { getCurrentUser } from "@/modules/auth/dal";
import { CSV_EXPORTS, type CsvExport, exportCsv } from "@/modules/backup/service";

/** /api/export/time-entries | problems | applications → CSV download. */
export async function GET(_request: Request, ctx: RouteContext<"/api/export/[kind]">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { kind } = await ctx.params;
  if (!(CSV_EXPORTS as readonly string[]).includes(kind)) {
    return Response.json({ error: "Unknown export." }, { status: 404 });
  }
  const csv = await exportCsv(user, kind as CsvExport);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crackit-${kind}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
