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
