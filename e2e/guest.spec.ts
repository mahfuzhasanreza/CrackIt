import { expect, test } from "@playwright/test";

test("anyone can try the app as a guest with demo data, then sign up", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Welcome back, Guest" })).toBeVisible();
  const banner = page.getByRole("status").filter({ hasText: "guest account" });
  await expect(banner).toContainText("deleted in 2");
  // Demo data: a running timer and real-looking applications.
  await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
  await page.goto("/applications?view=board");
  await expect(page.getByText("Northwind Labs")).toBeVisible();

  // Leaving the guest account for a real one.
  await banner.getByRole("button", { name: "Create your own account" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
});

test("a guest can close the guest notice for good", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  const banner = page.getByRole("status").filter({ hasText: "guest account" });
  await banner.getByRole("button", { name: "Close guest account notice" }).click();
  await expect(banner).toHaveCount(0);
  // Stays closed on other pages and after a reload.
  await page.goto("/applications");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(banner).toHaveCount(0);
});
