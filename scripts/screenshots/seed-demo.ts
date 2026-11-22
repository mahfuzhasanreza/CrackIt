/**
 * (Re)creates the demo account for the README screenshots and fills it with the same made-up
 * data guests get (`prisma/demo-data.ts`). Run by the screenshots Playwright global setup
 * (via tsx). Expects DATABASE_URL = test DB.
 */
import { createScriptClient } from "../../prisma/client";
import { seedDemoData } from "../../prisma/demo-data";
import { hashPassword } from "../../src/modules/auth/password";

import { DEMO_USER } from "./demo-user";

const TIMEZONE = "Asia/Dhaka";
const DAY_START_HOUR = 4;

async function main() {
  const prisma = createScriptClient();
  try {
    await prisma.user.deleteMany({ where: { email: DEMO_USER.email } }); // everything cascades
    const user = await prisma.user.create({
      data: {
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        timezone: TIMEZONE,
        dayStartHour: DAY_START_HOUR,
        passwordHash: await hashPassword(DEMO_USER.password),
      },
    });
    await seedDemoData(prisma, user.id, { timezone: TIMEZONE, dayStartHour: DAY_START_HOUR });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
