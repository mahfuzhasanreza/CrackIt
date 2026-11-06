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
    await prisma.signupAttempt.deleteMany();
    // Accounts made by the sign-up test (everything they own cascades).
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-signup" } } });
    const testUsers = { user: { email: { in: Object.values(USERS).map((u) => u.email) } } };
    await prisma.timeEntry.deleteMany({ where: testUsers });
    await prisma.dailyLog.deleteMany({ where: testUsers });
    await prisma.learningEntry.deleteMany({ where: testUsers });

    await prisma.checklist.deleteMany({ where: testUsers });
    await prisma.problem.deleteMany({ where: testUsers });
    await prisma.project.deleteMany({ where: testUsers });
    await prisma.vivaQuestion.deleteMany({ where: testUsers });
    await prisma.teachingDemo.deleteMany({ where: testUsers });
    await prisma.publication.deleteMany({ where: testUsers });
    await prisma.course.deleteMany({ where: testUsers });
    await prisma.mockInterview.deleteMany({ where: testUsers });
    await prisma.organization.deleteMany({ where: testUsers }); // cascades applications
    await prisma.resource.deleteMany({ where: testUsers });
    await prisma.goal.deleteMany({ where: testUsers });
    await prisma.tag.deleteMany({ where: testUsers });
    // Tracks (with their topics) and activity types are re-seeded below, so edits from earlier
    // runs (e.g. the settings tests) are reset.
    await prisma.track.deleteMany({ where: testUsers });
    await prisma.activityType.deleteMany({ where: testUsers });
    for (const u of Object.values(USERS)) {
      const data = {
        name: u.name,
        timezone: "Asia/Dhaka",
        dayStartHour: 4,
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
    await seedAnalyticsHistory(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

/** A few days of study and sleep so the analytics charts have something to show. */
async function seedAnalyticsHistory(prisma: ReturnType<typeof createScriptClient>) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: USERS.analytics.email } });
  const types = await prisma.activityType.findMany({ where: { userId: user.id } });
  const track = await prisma.track.findFirstOrThrow({
    where: { userId: user.id, name: "SWE / Full-Stack" },
  });
  const study = types.find((t) => t.name === "Study")!;
  const sleep = types.find((t) => t.name === "Sleep")!;
  const H = 3_600_000;
  const now = Date.now();
  const entries = [1, 2, 3].flatMap((daysAgo) => {
    const base = now - daysAgo * 24 * H;
    return [
      {
        userId: user.id,
        activityTypeId: study.id,
        trackId: track.id,
        startedAt: new Date(base - 4 * H),
        endedAt: new Date(base - 2 * H),
        focusRating: daysAgo + 1,
      },
      {
        userId: user.id,
        activityTypeId: sleep.id,
        startedAt: new Date(base - 14 * H),
        endedAt: new Date(base - 7 * H),
      },
    ];
  });
  await prisma.timeEntry.createMany({ data: entries });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
