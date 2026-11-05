import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.topics);
});

test("set a status, add, rename and delete a subtopic", async ({ page }) => {
  await page.getByRole("link", { name: "Topics", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Topics", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SWE / Full-Stack" })).toBeVisible();

  // Inline status on a leaf updates the parent's progress.
  const dsaMeter = page.getByRole("meter", { name: "Data Structures & Algorithms progress" });
  await expect(dsaMeter).toHaveAttribute("aria-valuenow", "0");
  await pick(page, "Status of Arrays & Hashing", "Confident");
  await expect(dsaMeter).not.toHaveAttribute("aria-valuenow", "0");
  await page.reload();
  await expect(page.getByLabel("Status of Arrays & Hashing")).toHaveText(/Confident/);

  // Add a subtopic under Dynamic Programming.
  await page.getByRole("button", { name: "Actions for Dynamic Programming" }).click();
  await page.getByRole("menuitem", { name: "Add subtopic" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Knapsack");
  await page.getByRole("dialog").getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Topic added")).toBeVisible();
  await page.getByRole("button", { name: "Expand Dynamic Programming" }).click();
  await expect(page.getByLabel("Status of Knapsack")).toBeVisible();

  // Duplicate names are rejected.
  await page.getByRole("button", { name: "Actions for Dynamic Programming" }).click();
  await page.getByRole("menuitem", { name: "Add subtopic" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("knapsack");
  await page.getByRole("dialog").getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Already exists at this level")).toBeVisible();
  await page.keyboard.press("Escape");

  // Rename + focus star.
  await page.getByRole("button", { name: "Actions for Knapsack" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("0/1 Knapsack");
  await page.getByRole("dialog").getByLabel("Focus topic (starred)").check();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Topic saved")).toBeVisible();
  await expect(page.getByLabel("Status of 0/1 Knapsack")).toBeVisible();

  // Delete.
  await page.getByRole("button", { name: "Actions for 0/1 Knapsack" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Topic deleted")).toBeVisible();
  await expect(page.getByLabel("Status of 0/1 Knapsack")).toBeHidden();
});

test("switch tracks", async ({ page }) => {
  await page.goto("/topics");
  await page
    .getByRole("navigation", { name: "Tracks" })
    .getByRole("link", { name: /University Lecturer/ })
    .click();
  await expect(page.getByRole("heading", { name: "University Lecturer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions for Teaching Demo" })).toBeVisible();
});
