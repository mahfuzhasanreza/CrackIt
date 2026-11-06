/**
 * Create a login account from the command line (people can also sign up at /register).
 *   pnpm user:create --email you@example.com [--name "Your Name"] [--timezone Asia/Dhaka]
 *                    [--starter-tracks]
 * --starter-tracks also adds the SWE / Full-Stack and University Lecturer tracks with their
 * topic roadmaps; without it the account starts with no tracks, like a sign-up.
 * Password is prompted (hidden) or read from CRACKIT_PASSWORD.
 */
import { parseArgs } from "node:util";

import { z } from "zod";

import { createScriptClient } from "../prisma/client";
import { seedDefaultsForUser } from "../prisma/seed-defaults";
import { hashPassword } from "../src/modules/auth/password";
import { emailSchema, newPasswordSchema } from "../src/modules/auth/validators";

import { readNewPassword } from "./prompt";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    timezone: { type: "string", default: "Asia/Dhaka" },
    "starter-tracks": { type: "boolean", default: false },
  },
});

async function main() {
  const email = emailSchema.parse(values.email ?? "");
  try {
    new Intl.DateTimeFormat("en", { timeZone: values.timezone });
  } catch {
    throw new Error(`Unknown timezone: ${values.timezone}`);
  }

  const prisma = createScriptClient();
  try {
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new Error(`User ${email} already exists. Use \`pnpm user:reset-password\`.`);
    }
    const password = newPasswordSchema.parse(await readNewPassword());
    const user = await prisma.user.create({
      data: {
        email,
        name: values.name?.trim() || null,
        timezone: values.timezone,
        passwordHash: await hashPassword(password),
      },
    });
    const starterTracks = values["starter-tracks"] ?? false;
    await seedDefaultsForUser(prisma, user.id, { starterTracks });
    console.log(
      starterTracks
        ? `Created ${email} with the starter tracks, topics and activity types.`
        : `Created ${email} with the default activity types (no tracks yet).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof z.ZodError ? z.prettifyError(e) : e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
