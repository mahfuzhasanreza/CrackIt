import { expect, test } from "@playwright/test";

import { logIn } from "./helpers";

const NEW_USER = {
  name: "Signup Person",
  email: "e2e-signup@crackit.local",
  password: "signup-password-1234",
};

test("anyone can create an account and lands on their dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();

  // Role locators skip the login page Next keeps mounted (hidden) after navigating.
  // Validation keeps what was typed.
  await page.getByRole("textbox", { name: "Name (optional)" }).fill(NEW_USER.name);
  await page.getByRole("textbox", { name: "Email" }).fill(NEW_USER.email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("short");
  await page.getByRole("textbox", { name: "Repeat password" }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 12 characters")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(NEW_USER.email);

  await page.getByRole("textbox", { name: "Password", exact: true }).fill(NEW_USER.password);
  await page.getByRole("textbox", { name: "Repeat password" }).fill(NEW_USER.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: `Welcome back, ${NEW_USER.name}` })).toBeVisible();

  // Starter tracks are there.
  await page.goto("/settings?tab=tracks");
  await expect(page.getByText("SWE / Full-Stack")).toBeVisible();

  // Signed-in users skip the register page.
  await page.goto("/register");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("an email can only register once, and the new account can log in", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("textbox", { name: "Email" }).fill(NEW_USER.email.toUpperCase());
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(NEW_USER.password);
  await page.getByRole("textbox", { name: "Repeat password" }).fill(NEW_USER.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists")).toBeVisible();

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  // Next keeps the register page mounted (hidden) after the client navigation.
  await page.reload();
  await logIn(page, NEW_USER.email, NEW_USER.password);
  await expect(page).toHaveURL(/\/dashboard/);
});
