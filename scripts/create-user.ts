/**
 * Create a login account (there is no public sign-up).
 *   pnpm user:create --email you@example.com [--name "Your Name"] [--timezone Asia/Dhaka]
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
    await seedDefaultsForUser(prisma, user.id);
    console.log(`Created ${email} with default tracks, topics and activity types.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof z.ZodError ? z.prettifyError(e) : e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
