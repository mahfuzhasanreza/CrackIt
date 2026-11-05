import { execSync } from "node:child_process";

import { TEST_DATABASE_URL } from "./test-env";

/** Vitest globalSetup for integration tests: bring the test DB to the latest schema. */
export default function setup() {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
  });
}
