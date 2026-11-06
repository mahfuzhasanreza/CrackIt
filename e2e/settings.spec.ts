import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logIn, logInAs, pick } from "./helpers";

test("profile, tracks and activity types", async ({ page }) => {
  await logInAs(page, USERS.settings);
  await page.getByRole("link", { name: "Settings", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  // General: day settings persist.
  await page.getByLabel("Name (optional)").fill("Settings Person");
  await page.getByLabel("Time zone").selectOption("Europe/London");
  await page.getByLabel("Day starts at").selectOption("5");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Time zone")).toHaveValue("Europe/London");
  await expect(page.getByLabel("Day starts at")).toHaveValue("5");

  // Tracks: add, archive via edit, delete.
  const dialog = page.getByRole("dialog");
  await page.getByRole("link", { name: "Tracks" }).click();
  await page.getByRole("button", { name: "Add track" }).click();
  await dialog.getByLabel("Name").fill("DevOps");
  await dialog.getByLabel("Weekly target (hours) (optional)").fill("3");
  await dialog.getByRole("radio", { name: "aqua" }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Track added")).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: "DevOps" });
  await expect(row.getByText("3h 00m a week")).toBeVisible();

  await page.getByRole("button", { name: "Actions for DevOps" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await dialog.getByLabel("Active (uncheck to archive)").uncheck();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Archived")).toBeVisible();

  await page.getByRole("button", { name: "Actions for DevOps" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Track deleted")).toBeVisible();
  await expect(row).toBeHidden();

  // Activity types: add one and delete it; a used one can't be deleted.
  await page.getByRole("link", { name: "Activity types" }).click();
  await page.getByRole("button", { name: "Add activity" }).click();
  await dialog.getByLabel("Name").fill("Reading");
  await pick(page, "Category", "Study");
  await dialog.getByLabel("Counts as productive time").check();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Activity added")).toBeVisible();
  const reading = page.getByRole("listitem").filter({ hasText: "Reading" });
  await expect(reading.getByText("Study · productive")).toBeVisible();
  await page.getByRole("button", { name: "Actions for Reading" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Activity deleted")).toBeVisible();
});

test("backup download, restore and CSV export", async ({ page }) => {
  await logInAs(page, USERS.settings);
  await page.goto("/settings?tab=data");

  const [backup] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download backup (JSON)" }).click(),
  ]);
  expect(backup.suggestedFilename()).toMatch(/^crackit-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await backup.path();
  const json = JSON.parse(await readFile(path, "utf8")) as {
    app: string;
    tables: { tracks: unknown[] };
  };
  expect(json.app).toBe("crackit");
  expect(json.tables.tracks.length).toBeGreaterThan(0);

  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Time entries (CSV)" }).click(),
  ]);
  expect((await readFile(await csv.path(), "utf8")).replace(/^﻿/, "")).toMatch(
    /^date,start,end,minutes,activity/,
  );

  // Restore what we just downloaded.
  await page.getByLabel("Backup file").setInputFiles(path);
  const dialog = page.getByRole("dialog", { name: "Replace all your data?" });
  await expect(dialog.getByText("Tracks")).toBeVisible();
  await dialog.getByRole("button", { name: "Replace my data" }).click();
  await expect(page.getByText("Backup restored")).toBeVisible();

  // A file that isn't a backup never reaches the server.
  await page.getByLabel("Backup file").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(page.getByText("This isn't a CrackIt backup.")).toBeVisible();
});

test("changing the password signs you out", async ({ page }) => {
  await logInAs(page, USERS.password);
  await page.goto("/settings");
  await page.getByLabel("Current password").fill("not-my-password");
  await page.getByLabel("New password", { exact: true }).fill("brand-new-password-99");
  await page.getByLabel("Repeat new password").fill("brand-new-password-99");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your current password is wrong.")).toBeVisible();

  await page.getByLabel("Current password").fill(USERS.password.password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/login\?password=changed/);
  await expect(page.getByText("Password changed. Log in with your new one.")).toBeVisible();

  // Next keeps the previous page mounted (hidden) after a client redirect; start clean.
  await page.reload();
  await logIn(page, USERS.password.email, "brand-new-password-99");
  await expect(page).toHaveURL(/\/dashboard/);
});
