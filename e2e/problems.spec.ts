import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.swe);
});

test("add a problem, log attempts, filter by pattern", async ({ page }) => {
  await page.getByRole("link", { name: "Problems", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Problems", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Add problem" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Course Schedule");
  await dialog.getByLabel("Link (optional)").fill("https://leetcode.com/problems/course-schedule/");
  await pick(page, "Difficulty", "Medium");
  await dialog.getByLabel("Patterns (optional)").fill("Graphs, topological sort");
  await pick(page, "Topic (optional)", "Graphs (BFS, DFS, Topological Sort)");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Problem added")).toBeVisible();

  const row = page.getByRole("row", { name: /Course Schedule/ });
  await expect(row.getByText("To do")).toBeVisible();
  await expect(row.getByText("topological sort", { exact: true })).toBeVisible();

  // Duplicate links are rejected.
  await page.getByRole("button", { name: "Add problem" }).click();
  await dialog.getByLabel("Title").fill("Dup");
  await dialog.getByLabel("Link (optional)").fill("https://leetcode.com/problems/course-schedule/");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Already tracked")).toBeVisible();
  await page.keyboard.press("Escape");

  // Failed attempt, then solved.
  await row.getByRole("button", { name: "Actions for Course Schedule" }).click();
  await page.getByRole("menuitem", { name: "Log attempt" }).click();
  await dialog.getByLabel("Minutes spent").fill("30");
  await dialog.getByRole("button", { name: "Log attempt" }).click();
  await expect(page.getByText("Attempt logged")).toBeVisible();
  await expect(row.getByText("Attempted")).toBeVisible();

  await row.getByRole("button", { name: "Actions for Course Schedule" }).click();
  await page.getByRole("menuitem", { name: "Log attempt" }).click();
  await dialog.getByLabel("Minutes spent").fill("15");
  await dialog.getByLabel("Solved it").check();
  await dialog.getByRole("button", { name: "Log attempt" }).click();
  await expect(page.getByText(/Solved! First revision is tomorrow/)).toBeVisible();
  await expect(row.getByText("Solved", { exact: true })).toBeVisible();
  await expect(row.getByRole("cell", { name: "45m" })).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "Solved" }).locator("..")).toContainText(
    "1",
  );

  // Pattern filter.
  await pick(page, "Pattern filter", "graphs");
  await expect(page).toHaveURL(/tag=graphs/);
  await expect(row).toBeVisible();
  await pick(page, "Difficulty filter", "Hard");
  await expect(page.getByText("No problems match these filters.")).toBeVisible();
});

test("track a portfolio project", async ({ page }) => {
  await page.getByRole("link", { name: "Projects", exact: true }).first().click();
  await page.getByRole("button", { name: "Add project" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("CrackIt");
  await dialog.getByLabel("Stack (optional)").fill("Next.js, PostgreSQL, next.js");
  await dialog.getByLabel("Repository (optional)").fill("https://github.com/me/crackit");
  await dialog
    .getByLabel("Interview talking points (optional)")
    .fill("- **Hardest bug:** overlaps");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Project added")).toBeVisible();

  const card = page.getByRole("region", { name: "CrackIt" });
  await expect(card.getByRole("list", { name: "Stack" }).getByRole("listitem")).toHaveCount(2);
  await expect(card.getByRole("link", { name: "github.com" })).toBeVisible();
  await card.getByText("Interview talking points").click();
  await expect(card.locator("strong", { hasText: "Hardest bug:" })).toBeVisible();

  await card.getByRole("button", { name: "Actions for CrackIt" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await pick(page, "Status", "Shipped");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Project saved")).toBeVisible();
  await expect(card.getByText("Shipped")).toBeVisible();
});
