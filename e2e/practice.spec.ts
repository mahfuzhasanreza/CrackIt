import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.practice);
});

test("question bank: add a question for a track and reveal the answer", async ({ page }) => {
  await page.getByRole("link", { name: "Practice", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Practice", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lecturer" })).toHaveCount(0);

  await page.getByRole("button", { name: "Add question" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Question").fill("Tell me about a time you disagreed with a teammate.");
  await pick(page, "Track (optional)", "SWE / Full-Stack");
  await dialog
    .getByLabel("Model answer (Markdown) (optional)")
    .fill("Use **STAR**: situation, task, action, result.");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/first practice tomorrow/)).toBeVisible();

  const card = page.getByRole("listitem", {
    name: "Tell me about a time you disagreed with a teammate.",
  });
  await expect(card.getByText("SWE / Full-Stack")).toBeVisible();
  await expect(card.getByText(/^Next /)).toBeVisible();
  await card.getByRole("button", { name: "Show answer" }).click();
  await expect(card.locator("strong", { hasText: "STAR" })).toBeVisible();
});

test("presentations: log one with a score; the old lecturer URL redirects", async ({ page }) => {
  await page.goto("/lecturer");
  await expect(page).toHaveURL(/\/practice$/);

  await page
    .getByRole("navigation", { name: "Practice sections" })
    .getByRole("link", { name: "Presentations" })
    .click();
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Log presentation" }).click();
  await dialog.getByLabel("Title").fill("Portfolio project walkthrough");
  await pick(page, "Audience", "Mock panel");
  await dialog.getByLabel("Duration (minutes)").fill("20");
  await dialog
    .getByRole("group", { name: /Self-score/ })
    .getByText("4", { exact: true })
    .click();
  await dialog.getByLabel("Feedback (Markdown) (optional)").fill("- **Pace** was too fast");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Presentation logged")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfolio project walkthrough" })).toBeVisible();
  await expect(page.locator("strong", { hasText: "Pace" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "4/5" })).toBeVisible();
});
