/**
 * Prepares the e2e database (run by global-setup via tsx, because Prisma's generated
 * client is ESM and Playwright loads TS as CommonJS). Expects DATABASE_URL = test DB.
 */
import { createScriptClient } from "../prisma/client";
import { seedDefaultsForUser } from "../prisma/seed-defaults";
import { hashPassword } from "../src/modules/auth/password";

import { USERS } from "./fixtures";

async function main() {
  const prisma = createScriptClient();
  try {
    await prisma.loginAttempt.deleteMany();
    const testUsers = { user: { email: { in: Object.values(USERS).map((u) => u.email) } } };
    await prisma.timeEntry.deleteMany({ where: testUsers });
    await prisma.dailyLog.deleteMany({ where: testUsers });
    await prisma.learningEntry.deleteMany({ where: testUsers });
    await prisma.tag.deleteMany({ where: testUsers });
    await prisma.checklist.deleteMany({ where: testUsers });
    // Topics are re-seeded below, so edits from earlier runs are reset.
    await prisma.topic.deleteMany({ where: testUsers });
    for (const u of Object.values(USERS)) {
      const data = {
        name: u.name,
        passwordHash: await hashPassword(u.password),
        sessionVersion: 0,
      };
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: data,
        create: { email: u.email, ...data },
      });
      await seedDefaultsForUser(prisma, user.id);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
