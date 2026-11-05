/**
 * Development seed: ensures a dev user exists and gives it the default data.
 * Run with `pnpm db:seed`. Idempotent.
 * (Real accounts are created with `pnpm user:create` from Phase 2.)
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

import { seedDefaultsForUser } from "./seed-defaults";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set (see .env.example)");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = (process.env.SEED_USER_EMAIL ?? "dev@crackit.local").toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Dev User" },
  });
  await seedDefaultsForUser(prisma, user.id);

  const [tracks, topics, activityTypes] = await Promise.all([
    prisma.track.count({ where: { userId: user.id } }),
    prisma.topic.count({ where: { userId: user.id } }),
    prisma.activityType.count({ where: { userId: user.id } }),
  ]);
  console.log(
    `Seeded ${email}: ${tracks} tracks, ${topics} topics, ${activityTypes} activity types`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
