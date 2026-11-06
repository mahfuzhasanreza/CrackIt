import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.resources);
});

test("add a book, step through it, finish it, then find it under Done", async ({ page }) => {
  await page.getByRole("link", { name: "Resources", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Resources", level: 1 })).toBeVisible();
  const dialog = page.getByRole("dialog");

  await page.getByRole("button", { name: "Add resource" }).click();
  await dialog.getByLabel("Title").fill("System Design Interview");
  await dialog.getByLabel("Author / instructor (optional)").fill("Alex Xu");
  await dialog.getByLabel("Total (optional)").fill("3");
  await pick(page, "Track (optional)", "SWE / Full-Stack");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Resource added")).toBeVisible();

  const card = page.getByRole("region", { name: "System Design Interview" });
  await expect(card.getByText("Planned", { exact: true })).toBeVisible();
  await expect(card.getByText("0 / 3 chapters")).toBeVisible();

  // "+1" starts it.
  await card.getByRole("button", { name: "Add one chapter to System Design Interview" }).click();
  await expect(card.getByText("1 / 3 chapters")).toBeVisible();
  await expect(card.getByText("In progress", { exact: true })).toBeVisible();
  await expect(card.getByRole("meter")).toHaveAttribute("aria-valuenow", "33");

  // Logging the last chapter finishes it.
  await page.getByRole("button", { name: "Actions for System Design Interview" }).click();
  await page.getByRole("menuitem", { name: "Log progress" }).click();
  await dialog.getByLabel("Chapters done (of 3)").fill("3");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Finished — nice work!")).toBeVisible();

  // Gone from Active, listed under Done.
  await expect(card).toBeHidden();
  await page.getByRole("link", { name: /^Done \(1\)/ }).click();
  await expect(card.getByText("Done", { exact: true })).toBeVisible();
  await expect(card.getByText(/^Finished /)).toBeVisible();

  // Rate it (the rating only appears for finished resources).
  await page.getByRole("button", { name: "Actions for System Design Interview" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await dialog
    .getByRole("group", { name: /Worth it/ })
    .getByText("5", { exact: true })
    .click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Resource saved")).toBeVisible();
  await expect(card.getByLabel("Rated 5 of 5")).toBeVisible();
});

test("open-ended sheet, drop and delete", async ({ page }) => {
  await page.goto("/resources");
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Add resource" }).click();
  await dialog.getByLabel("Title").fill("Blind 75");
  await pick(page, "Type", "Problem sheet");
  await dialog.getByLabel("Done so far").fill("12");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Resource added")).toBeVisible();

  const card = page.getByRole("region", { name: "Blind 75" });
  await expect(card.getByText("12 problems")).toBeVisible();
  await expect(card.getByText("In progress", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Actions for Blind 75" }).click();
  await page.getByRole("menuitem", { name: "Drop" }).click();
  await expect(page.getByText("Marked as dropped")).toBeVisible();
  await expect(card).toBeHidden();

  await page.getByRole("link", { name: /^Dropped/ }).click();
  await page.getByRole("button", { name: "Actions for Blind 75" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Resource deleted")).toBeVisible();
  await expect(card).toBeHidden();
});
