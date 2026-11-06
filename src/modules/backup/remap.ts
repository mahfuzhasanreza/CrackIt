import { z } from "zod";

import {
  BACKUP_APP,
  BACKUP_VERSION,
  type Backup,
  type Row,
  TABLES,
  type TableKey,
  type Tables,
} from "./spec";

export class BackupError extends Error {}

const row = z.record(z.string(), z.unknown());
const uuid = z.uuid();

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP, { message: "This isn't a CrackIt backup." }),
  version: z.literal(BACKUP_VERSION, { message: "This backup is from another CrackIt version." }),
  exportedAt: z.string(),
  profile: z.object({
    name: z.string().max(80).nullable(),
    timezone: z.string().min(1),
    dayStartHour: z.number().int().min(0).max(12),
  }),
  tables: z
    .object(Object.fromEntries(TABLES.map((t) => [t.key, z.array(row).default([])])))
    .strict(),
});

/** Parse an uploaded file's JSON. Throws `BackupError` with a readable message. */
export function parseBackup(json: unknown): Backup {
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    const where = issue.path.length ? ` (at ${issue.path.join(".")})` : "";
    throw new BackupError(`${issue.message}${where}`);
  }
  return parsed.data as Backup;
}

export const countRows = (tables: Tables) =>
  Object.fromEntries(TABLES.map((t) => [t.key, tables[t.key].length])) as Record<TableKey, number>;

/**
 * Give every row a fresh id, point every reference at the new ids, and stamp `userId`.
 * Fails on duplicate ids or a reference to something that isn't in the backup, so a crafted
 * file can never attach rows to another account's data.
 */
export function remapBackup(tables: Tables, userId: string, newId: () => string): Tables {
  const ids = new Map<string, Map<string, string>>();
  const out = {} as Tables;

  // Ids first (topics reference topics, so every table's map must exist before rewriting).
  for (const t of TABLES) {
    if (!t.hasId) continue;
    const map = new Map<string, string>();
    tables[t.key].forEach((r, i) => {
      const id = r.id;
      if (typeof id !== "string" || !uuid.safeParse(id).success) {
        throw new BackupError(`${t.key}[${i}] has no valid id.`);
      }
      if (map.has(id)) throw new BackupError(`${t.key} has the id ${id} twice.`);
      map.set(id, newId());
    });
    ids.set(t.key, map);
  }

  for (const t of TABLES) {
    out[t.key] = tables[t.key].map((r, i) => {
      const next: Row = { ...r };
      if ("userId" in next || t.owned) {
        if (!t.owned) throw new BackupError(`${t.key}[${i}] has an unexpected userId.`);
        next.userId = userId;
      }
      if (t.hasId) next.id = ids.get(t.key)!.get(r.id as string);
      for (const [field, target] of Object.entries(t.refs)) {
        const value = r[field];
        if (value === null || value === undefined) continue;
        const mapped = typeof value === "string" ? ids.get(target)!.get(value) : undefined;
        if (!mapped) {
          throw new BackupError(`${t.key}[${i}].${field} points at something not in the backup.`);
        }
        next[field] = mapped;
      }
      return next;
    });
  }

  // Parents before children within topics (self-reference).
  out.topics = sortParentsFirst(out.topics);
  return out;
}

function sortParentsFirst(rows: Row[]): Row[] {
  const byId = new Map(rows.map((r) => [r.id as string, r]));
  const depth = (r: Row, seen = new Set<string>()): number => {
    const parent = r.parentId as string | null | undefined;
    if (!parent) return 0;
    if (seen.has(parent)) throw new BackupError("topics contain a cycle.");
    seen.add(parent);
    const p = byId.get(parent);
    return p ? 1 + depth(p, seen) : 0;
  };
  return rows
    .map((r) => ({ r, d: depth(r) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.r);
}
