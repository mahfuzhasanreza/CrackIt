/**
 * Set a new password and sign out every existing session.
 *   pnpm user:reset-password --email you@example.com
 * Password is prompted (hidden) or read from CRACKIT_PASSWORD.
 */
import { parseArgs } from "node:util";

import { z } from "zod";

import { createScriptClient } from "../prisma/client";
import { hashPassword } from "../src/modules/auth/password";
import { emailSchema, newPasswordSchema } from "../src/modules/auth/validators";

import { readNewPassword } from "./prompt";

const { values } = parseArgs({ options: { email: { type: "string" } } });

async function main() {
  const email = emailSchema.parse(values.email ?? "");
  const prisma = createScriptClient();
  try {
    if (!(await prisma.user.findUnique({ where: { email } }))) {
      throw new Error(`No user with email ${email}.`);
    }
    const password = newPasswordSchema.parse(await readNewPassword());
    await prisma.user.update({
      where: { email },
      data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
    });
    // Clear lockout so the owner can log in immediately.
    await prisma.loginAttempt.deleteMany({ where: { email, success: false } });
    console.log(`Password updated for ${email}. All other sessions are now signed out.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof z.ZodError ? z.prettifyError(e) : e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
