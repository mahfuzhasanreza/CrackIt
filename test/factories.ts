import { randomUUID } from "node:crypto";

import { seedDefaultsForUser } from "../prisma/seed-defaults";
import { db } from "../src/lib/db";

/** A fresh user with the default tracks, topics and activity types. */
export async function createTestUser(overrides: { timezone?: string; dayStartHour?: number } = {}) {
  const user = await db.user.create({
    data: { email: `test-${randomUUID()}@crackit.local`, name: "Test", ...overrides },
  });
  await seedDefaultsForUser(db, user.id, { starterTracks: true });
  const [activityTypes, tracks, topics] = await Promise.all([
    db.activityType.findMany({ where: { userId: user.id } }),
    db.track.findMany({ where: { userId: user.id } }),
    db.topic.findMany({ where: { userId: user.id } }),
  ]);
  const activity = (name: string) => activityTypes.find((a) => a.name === name)!;
  const track = (name: string) => tracks.find((t) => t.name === name)!;
  const topic = (name: string) => topics.find((t) => t.name === name)!;
  return { user, activity, track, topic };
}
