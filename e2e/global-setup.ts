import { execSync } from "node:child_process";

import { TEST_DATABASE_URL } from "./fixtures";

/** Fresh, deterministic test database: apply migrations, then (re)create the e2e users. */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL };
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env });
  execSync("pnpm exec tsx e2e/setup-db.ts", { stdio: "inherit", env });
}
