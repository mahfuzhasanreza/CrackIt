import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Ids for tag names (lower-cased already), creating missing tags. Run inside a transaction. */
export async function upsertTagIds(tx: Tx, userId: string, names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const tag = await tx.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
      select: { id: true },
    });
    ids.push(tag.id);
  }
  return ids;
}

/** Delete tags nothing uses any more. Add new taggables here. */
export function deleteOrphanTags(tx: Tx, userId: string) {
  return tx.tag.deleteMany({
    where: { userId, learningEntries: { none: {} }, problems: { none: {} } },
  });
}
