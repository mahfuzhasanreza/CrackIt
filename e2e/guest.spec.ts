import { expect, test } from "@playwright/test";

test("anyone can try the shared guest account with demo data, then sign up", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Welcome back, Guest" })).toBeVisible();
  const banner = page.getByRole("status").filter({ hasText: "shared guest account" });
  await expect(banner).toBeVisible();
  await page.goto("/applications?view=board");
  await expect(page.getByText("Northwind Labs")).toBeVisible();

  // Account-level settings are locked for everyone sharing it.
  await page.goto("/settings");
  await expect(page.getByText("The shared guest account can't change this.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Change password" })).toHaveCount(0);
  await page.goto("/settings?tab=data");
  await expect(page.getByRole("heading", { name: "Restore from a backup" })).toHaveCount(0);

  // Leaving the guest account for a real one.
  await banner.getByRole("button", { name: "Create your own account" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();

  // Coming back as a guest lands in the same account.
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Guest" })).toBeVisible({
    timeout: 30_000,
  });
});
