import "server-only";

import { randomUUID } from "node:crypto";

import { dbDateToKey, toDateKey, toLocalDateTimeInput } from "@/lib/dates";
import { err, ok, type Result } from "@/lib/result";

import { isValidTimeZone } from "../settings/validators";

import { toCsv } from "./csv";
import { BackupError, countRows, parseBackup, remapBackup } from "./remap";
import * as repo from "./repository";
import { BACKUP_APP, BACKUP_VERSION, type Backup, TABLES, type TableKey } from "./spec";

export async function exportBackup(userId: string, now = new Date()): Promise<Backup> {
  const { profile, tables } = await repo.readAll(userId);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    profile,
    tables,
  };
}

/**
 * Replace all of the user's data with a backup. Everything is validated and remapped before
 * anything is deleted; the replace itself is one transaction, so a failure changes nothing.
 */
export async function importBackup(
  userId: string,
  json: unknown,
): Promise<Result<{ counts: Record<TableKey, number> }>> {
  let backup: Backup;
  let tables;
  try {
    backup = parseBackup(json);
    if (!isValidTimeZone(backup.profile.timezone)) throw new BackupError("Unknown time zone.");
    tables = remapBackup(backup.tables, userId, randomUUID);
  } catch (e) {
    if (e instanceof BackupError) return err("VALIDATION", e.message);
    throw e;
  }
  try {
    await repo.replaceAll(
      userId,
      backup.profile,
      tables,
      TABLES.map((t) => t.key),
    );
  } catch (e) {
    // The DB rejected a row (bad type, failed CHECK, ...). Nothing was changed.
    const detail = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : undefined;
    return err(
      "VALIDATION",
      `The backup couldn't be restored; your data is unchanged.${detail ? ` (${detail.slice(0, 200)})` : ""}`,
    );
  }
  return ok({ counts: countRows(tables) });
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export const CSV_EXPORTS = ["time-entries", "problems", "applications"] as const;
export type CsvExport = (typeof CSV_EXPORTS)[number];

/** A spreadsheet-friendly export. Times are local ("YYYY-MM-DDTHH:mm") in the user's zone. */
export async function exportCsv(
  user: { id: string; timezone: string },
  kind: CsvExport,
): Promise<string> {
  const local = (d: Date | null) =>
    d ? toLocalDateTimeInput(d, user.timezone).replace("T", " ") : "";
  if (kind === "time-entries") {
    const rows = await repo.listTimeEntriesForCsv(user.id);
    return toCsv(
      [
        "date",
        "start",
        "end",
        "minutes",
        "activity",
        "category",
        "track",
        "topic",
        "focus",
        "source",
        "note",
      ],
      rows.map((e) => [
        toDateKey(e.startedAt, user.timezone),
        local(e.startedAt),
        local(e.endedAt),
        Math.round((e.endedAt!.getTime() - e.startedAt.getTime()) / 60_000),
        e.activityType.name,
        e.activityType.category,
        e.track?.name,
        e.topic?.name,
        e.focusRating,
        e.source,
        e.note,
      ]),
    );
  }
  if (kind === "problems") {
    const rows = await repo.listProblemsForCsv(user.id);
    return toCsv(
      [
        "title",
        "platform",
        "difficulty",
        "status",
        "attempts",
        "minutes",
        "solved",
        "next review",
        "tags",
        "url",
      ],
      rows.map((p) => [
        p.title,
        p.platform,
        p.difficulty,
        p.status,
        p.attempts,
        p.timeSpentMin,
        local(p.solvedAt),
        p.nextReviewOn ? dbDateToKey(p.nextReviewOn) : "",
        p.tags.map((t) => t.tag.name).join(" "),
        p.url,
      ]),
    );
  }
  const rows = await repo.listApplicationsForCsv(user.id);
  return toCsv(
    [
      "organization",
      "type",
      "role",
      "track",
      "status",
      "applied",
      "deadline",
      "interviews",
      "source",
      "salary",
      "url",
    ],
    rows.map((a) => [
      a.organization.name,
      a.organization.type,
      a.role,
      a.track?.name,
      a.status,
      a.appliedOn ? dbDateToKey(a.appliedOn) : "",
      a.deadlineOn ? dbDateToKey(a.deadlineOn) : "",
      a._count.interviews,
      a.source,
      a.salaryRange,
      a.jobUrl,
    ]),
  );
}
