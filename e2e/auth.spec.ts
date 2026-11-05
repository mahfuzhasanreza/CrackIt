import { execSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

import { TEST_DATABASE_URL, USERS } from "./fixtures";
import { logIn } from "./helpers";

/** The form's error alert (Next's route announcer also has role="alert"). */
const formAlert = (page: Page, text: string | RegExp) =>
  page.getByRole("alert").filter({ hasText: text });

test("unauthenticated visitors are sent to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("shows validation and credential errors", async ({ page }) => {
  await page.goto("/login");
  await logIn(page, "not-an-email", "x");
  await expect(page.getByText("Enter a valid email")).toBeVisible();

  await logIn(page, USERS.main.email, "wrong-password");
  await expect(formAlert(page, "Invalid email or password.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(USERS.main.email);
});

test("logs in, returns to the requested page, and logs out", async ({ page }) => {
  await page.goto("/dashboard?from=e2e");
  await logIn(page, USERS.main.email, USERS.main.password);
  await expect(page).toHaveURL(/\/dashboard\?from=e2e$/);
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${USERS.main.name}` }),
  ).toBeVisible();

  // Signed-in users skip the login page.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("locks an email after 5 failed attempts", async ({ page }) => {
  await page.goto("/login");
  const email = "brute-force@crackit.local";
  for (let i = 0; i < 5; i++) {
    await logIn(page, email, `guess-${i}`);
    await expect(formAlert(page, "Invalid email or password.")).toBeVisible();
  }
  await logIn(page, email, "guess-6");
  await expect(formAlert(page, "Too many failed attempts")).toBeVisible();
});

test("password reset signs out existing sessions without a redirect loop", async ({ page }) => {
  await page.goto("/login");
  await logIn(page, USERS.reset.email, USERS.reset.password);
  await expect(page).toHaveURL(/\/dashboard$/);

  const newPassword = "brand-new-password-1234";
  execSync(`pnpm exec tsx scripts/reset-password.ts --email ${USERS.reset.email}`, {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      CRACKIT_PASSWORD: newPassword,
    },
  });

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/); // stale session rejected by the DAL
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  await logIn(page, USERS.reset.email, newPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
});
