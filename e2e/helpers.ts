import { expect, type Page } from "@playwright/test";

export async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  // Wait for the Server Action round-trip so repeated attempts can't race each other.
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/login")),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
}

export async function logInAs(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await logIn(page, user.email, user.password);
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Pick an option in a shadcn/Radix Select identified by its label. */
export async function pick(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
