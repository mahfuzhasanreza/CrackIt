/**
 * Development seed: ensures a dev user (with a password) exists and has the default data.
 * Run with `pnpm db:seed`. Idempotent. Refuses to run in production.
 * Real accounts are created with `pnpm user:create`.
 */
import { hashPassword } from "../src/modules/auth/password";
import { newPasswordSchema } from "../src/modules/auth/validators";

import { createScriptClient } from "./client";
import { seedDefaultsForUser } from "./seed-defaults";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed a dev user in production. Use `pnpm user:create`.");
}

const prisma = createScriptClient();

async function main() {
  const email = (process.env.SEED_USER_EMAIL ?? "dev@crackit.local").toLowerCase();
  const password = newPasswordSchema.parse(
    process.env.SEED_USER_PASSWORD ?? "crackit-dev-password",
  );

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Dev User" },
  });
  if (!user.passwordHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
    console.log(`Set dev password for ${email}`);
  }
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
