import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.journal);
});

test("save the daily log and see it after a reload", async ({ page }) => {
  await page.getByRole("link", { name: "Journal", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Daily log" })).toBeVisible();

  const log = page.getByRole("form", { name: "Daily log" });
  await log.getByRole("group", { name: /Mood/ }).getByText("4", { exact: true }).click();
  await log.getByLabel("Went to bed (last night)").fill("23:30");
  await log.getByLabel("Woke up").fill("07:00");
  await log.getByLabel("Wins").fill("Finished the graphs chapter");
  await log.getByRole("button", { name: "Save journal" }).click();
  await expect(page.getByText("Journal saved")).toBeVisible();

  await page.reload();
  await expect(log.getByText("Slept")).toContainText("7h 30m");
  await expect(log.getByLabel("Wins")).toHaveValue("Finished the graphs chapter");
  await expect(log.getByRole("radio", { name: "4" }).first()).toBeChecked();
});

test("log a learning entry with markdown and tags, then revise it", async ({ page }) => {
  await page.goto("/journal");
  // Log it on yesterday's page so it's due for revision today.
  await page.getByRole("link", { name: "Previous day" }).click();
  await expect(page).toHaveURL(/date=/);

  await page.getByRole("button", { name: "Add what I learned" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Dijkstra needs non-negative weights");
  await pick(page, "Track (optional)", "SWE / Full-Stack");
  await dialog
    .getByRole("textbox", { name: "Notes" })
    .fill("Use a **min-heap**.\n\n- O((V+E) log V)");
  await dialog.getByRole("tab", { name: "preview" }).click();
  await expect(dialog.locator("strong", { hasText: "min-heap" })).toBeVisible();
  await dialog.getByLabel("Tags (optional)").fill("Graphs, #shortest path");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Entry added")).toBeVisible();

  const card = page.getByRole("article", { name: "Dijkstra needs non-negative weights" });
  await expect(card.locator("strong", { hasText: "min-heap" })).toBeVisible();
  await expect(card.getByRole("link", { name: "#graphs" })).toBeVisible();
  await expect(card.getByRole("link", { name: "#shortest path" })).toBeVisible();

  // Today's page lists it as due; "Remembered" schedules the next revision.
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/journal$/);
  const due = page.getByRole("button", {
    name: 'Remembered "Dijkstra needs non-negative weights"',
  });
  await expect(due).toBeVisible();
  await due.click();
  await expect(page.getByText(/Next revision on/)).toBeVisible();
  await expect(due).toBeHidden();

  // The learning log filters by tag.
  await page.getByRole("link", { name: "All notes" }).click();
  await expect(page.getByRole("heading", { name: "Learning log" })).toBeVisible();
  await pick(page, "Tag", "#graphs");
  await expect(page).toHaveURL(/tag=graphs/);
  await expect(
    page.getByRole("article", { name: "Dijkstra needs non-negative weights" }),
  ).toBeVisible();
  await page.getByLabel("Search notes").fill("nothing-matches-this");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("No entries match these filters.")).toBeVisible();

  // Deleting from the card's own dialog still confirms with a toast.
  await page.getByRole("link", { name: "Clear" }).click();
  const title = "Dijkstra needs non-negative weights";
  await page.getByRole("button", { name: `Edit "${title}"` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText("Entry deleted")).toBeVisible();
  await expect(page.getByRole("article", { name: title })).toBeHidden();
});
