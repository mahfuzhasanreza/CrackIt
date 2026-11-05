import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.lecturer);
});

test("course, teaching demo and publication", async ({ page }) => {
  await page.getByRole("link", { name: "Lecturer", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Lecturer prep" })).toBeVisible();
  const dialog = page.getByRole("dialog");
  const sections = page.getByRole("navigation", { name: "Lecturer sections" });

  // Course
  await sections.getByRole("link", { name: "Courses" }).click();
  await page.getByRole("button", { name: "Add course" }).click();
  await dialog.getByLabel("Name").fill("Data Structures");
  await dialog.getByLabel("Code (optional)").fill("CSE 2101");
  await dialog
    .getByRole("group", { name: /Readiness/ })
    .getByText("3", { exact: true })
    .click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Course added")).toBeVisible();
  await expect(page.getByRole("meter", { name: "Data Structures readiness" })).toHaveAttribute(
    "aria-valuenow",
    "60",
  );

  // Demo linked to the course
  await sections.getByRole("link", { name: "Teaching demos" }).click();
  await page.getByRole("button", { name: "Log demo" }).click();
  await dialog.getByLabel("Topic").fill("Stacks and queues");
  await pick(page, "Course (optional)", "CSE 2101 · Data Structures");
  await pick(page, "Audience", "Mock panel");
  await dialog.getByLabel("Duration (minutes)").fill("20");
  await dialog
    .getByRole("group", { name: /Self-score/ })
    .getByText("4", { exact: true })
    .click();
  await dialog.getByLabel("Feedback (Markdown) (optional)").fill("- **Pace** was too fast");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Demo added")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stacks and queues" })).toBeVisible();
  await expect(page.locator("strong", { hasText: "Pace" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "4/5" })).toBeVisible();

  // Publication: submitting records a date
  await sections.getByRole("link", { name: "Publications" }).click();
  await page.getByRole("button", { name: "Add publication" }).click();
  await dialog.getByLabel("Title").fill("Spaced repetition for DSA learners");
  await pick(page, "Status", "Submitted");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Publication added")).toBeVisible();
  await expect(page.getByText(/^Submitted \d/)).toBeVisible();
});

test("viva bank: add a question and reveal the answer", async ({ page }) => {
  await page.goto("/lecturer?tab=viva");
  await page.getByRole("button", { name: "Add question" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Question").fill("What is a stable sort?");
  await dialog
    .getByLabel("Model answer (Markdown) (optional)")
    .fill("Keeps **equal keys** in order.");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/first practice tomorrow/)).toBeVisible();

  const card = page.getByRole("listitem", { name: "What is a stable sort?" });
  await expect(card.getByText(/^Next /)).toBeVisible();
  await card.getByRole("button", { name: "Show answer" }).click();
  await expect(card.locator("strong", { hasText: "equal keys" })).toBeVisible();
});
