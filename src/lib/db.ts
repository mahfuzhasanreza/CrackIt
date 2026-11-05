import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

import { env } from "./env";

/**
 * Shared Prisma client. Import ONLY from repositories (src/modules/<feature>/repository.ts).
 * Cached on globalThis in dev so hot reloads don't open a new pool each time.
 */
function createPrismaClient() {
  return new PrismaClient({
    // Small pool: on Vercel each function instance holds its own pool, and Neon's pooler
    // (DATABASE_URL) multiplexes them onto real connections.
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: 5 }),
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
