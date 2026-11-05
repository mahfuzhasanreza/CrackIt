import "dotenv/config";

import { defineConfig } from "prisma/config";

// The CLI (migrate, studio, seed) needs a *direct* connection. On Neon, DATABASE_URL is the
// pooled URL used by the app at runtime and DIRECT_URL is the direct one. Locally both are the
// same, so DIRECT_URL may be omitted. The URL is optional so `prisma generate` works without a DB.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});
