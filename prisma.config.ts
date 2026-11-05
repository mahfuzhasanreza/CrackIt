import "dotenv/config";

import { defineConfig } from "prisma/config";

// The CLI (migrate, studio, seed) needs a *direct* (non-pooled) connection. On Neon,
// DATABASE_URL is the pooled URL used by the app at runtime; the direct one is DIRECT_URL (set by
// us) or DATABASE_URL_UNPOOLED (set by the Neon–Vercel integration, incl. preview branches).
// Locally there's no pooler, so DATABASE_URL is fine. Optional so `prisma generate` needs no DB.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});
