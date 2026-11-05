import "server-only";

import { z } from "zod";

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// connection string");

/**
 * Server-side environment variables, validated once at startup.
 * Add new variables here (and to .env.example) as phases introduce them.
 * Never import this module from a Client Component.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Runtime connection (Neon: the pooled URL). */
  DATABASE_URL: postgresUrl,
  /** Migrations only (Neon: the direct URL). Read by prisma.config.ts, optional locally. */
  DIRECT_URL: postgresUrl.optional(),
  // Phase 2: AUTH_SECRET: z.string().min(32),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${issues.join("\n")}`);
  }
  return parsed.data;
}

export const env = parseServerEnv(process.env);
