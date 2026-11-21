import "dotenv/config";

import { defineConfig } from "@playwright/test";

/**
 * README screenshots (`pnpm screenshots`, after `pnpm build`). Runs the production build
 * against the test database, fills a demo account and writes PNGs to docs/screenshots/.
 * Not part of the e2e suite or CI.
 */
const PORT = 3200;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://crackit:crackit@localhost:5434/crackit_test";

export default defineConfig({
  testDir: ".",
  testMatch: "capture.spec.ts",
  globalSetup: "./global-setup.ts",
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    locale: "en-GB",
    timezoneId: "Asia/Dhaka",
  },
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
  },
});
