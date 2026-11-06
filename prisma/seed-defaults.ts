import type { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_ACTIVITY_TYPES } from "../src/modules/time-tracking/defaults";
import { DEFAULT_TRACKS, type DefaultTopic } from "../src/modules/tracks-topics/defaults";

/**
 * Give a user the default activity types and, only when asked, the starter tracks with their
 * topic trees (SWE / Full-Stack, University Lecturer). New sign-ups get no tracks: they pick
 * their own targets (or a template) on first visit.
 * Idempotent: safe to run repeatedly; existing rows (matched by name) are left untouched.
 * Used by `pnpm db:seed`, `pnpm user:create`, sign-up and tests.
 */
export async function seedDefaultsForUser(
  prisma: PrismaClient,
  userId: string,
  { starterTracks = false }: { starterTracks?: boolean } = {},
) {
  for (const [i, a] of DEFAULT_ACTIVITY_TYPES.entries()) {
    await prisma.activityType.upsert({
      where: { userId_name: { userId, name: a.name } },
      update: {},
      create: { ...a, userId, sortOrder: i },
    });
  }

  if (!starterTracks) return;
  for (const [i, t] of DEFAULT_TRACKS.entries()) {
    const track = await prisma.track.upsert({
      where: { userId_name: { userId, name: t.name } },
      update: {},
      create: {
        userId,
        name: t.name,
        description: t.description,
        color: t.color,
        weeklyTargetMinutes: t.weeklyTargetMinutes,
        sortOrder: i,
      },
    });
    await seedTopics(prisma, userId, track.id, null, t.topics);
  }
}

async function seedTopics(
  prisma: PrismaClient,
  userId: string,
  trackId: string,
  parentId: string | null,
  topics: DefaultTopic[],
) {
  for (const [i, t] of topics.entries()) {
    const existing = await prisma.topic.findFirst({ where: { trackId, parentId, name: t.name } });
    const topic =
      existing ??
      (await prisma.topic.create({
        data: { userId, trackId, parentId, name: t.name, sortOrder: i },
      }));
    if (t.children) await seedTopics(prisma, userId, trackId, topic.id, t.children);
  }
}
