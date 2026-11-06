import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

/** "YYYY-MM-DDTHH:mm" in Asia/Dhaka (the fixture users' zone), `days` from now. */
function dhakaLocal(days: number, time: string) {
  const d = new Date(Date.now() + days * 86_400_000);
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);
  return `${key}T${time}`;
}

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.interviews);
});

test("add an interview with a new application, open it, cancel-only before it happens", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Interviews", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Interviews", level: 1 })).toBeVisible();
  const dialog = page.getByRole("dialog");

  // No applications yet: the form offers to create one.
  await page.getByRole("button", { name: "Add interview" }).click();
  await dialog.getByLabel("Organization").fill("Initech");
  await dialog.getByLabel("Role").fill("Platform Engineer");
  await pick(page, "Round", "System design");
  await dialog.getByLabel("When").fill(dhakaLocal(2, "11:30"));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Interview added, with a new application")).toBeVisible();

  const upcoming = page.getByRole("region", { name: /^Upcoming \(1\)/ });
  const card = upcoming.getByRole("listitem", { name: "System design · Initech" });
  await expect(card).toBeVisible();
  await expect(card.getByText("11:30")).toBeVisible();
  await expect(card.getByText(/^in (1|2) days?$/)).toBeVisible();

  // Its own page: notes are empty prompts; only cancelling is possible before it happens.
  await card.getByRole("link", { name: "System design · Initech" }).click();
  await expect(
    page.getByRole("heading", { name: "System design · Initech", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("What did they ask? Use Edit to add it.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Passed" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark cancelled" })).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await dialog
    .getByLabel("Questions asked (Markdown) (optional)")
    .fill("- Design a **rate limiter**");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Interview saved")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Questions asked" })
      .locator("strong", { hasText: "rate limiter" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Platform Engineer" })).toBeVisible();
});

test("a past interview asks for its outcome; the calendar shows interviews and mocks", async ({
  page,
}) => {
  await page.goto("/interviews");
  const dialog = page.getByRole("dialog");

  await page.getByRole("button", { name: "Add interview" }).click();
  await pick(page, "Application", "+ New application…");
  await dialog.getByLabel("Organization").fill("Hooli");
  await dialog.getByLabel("Role").fill("SWE II");
  await pick(page, "Round", "Behavioral");
  await dialog.getByLabel("When").fill(dhakaLocal(-1, "15:00"));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Interview added, with a new application")).toBeVisible();

  const needs = page.getByRole("region", { name: /^Needs an outcome/ });
  await needs.getByRole("button", { name: "Passed" }).click();
  await expect(page.getByText("Marked as passed")).toBeVisible();
  await expect(needs).toBeHidden();
  await expect(
    page
      .getByRole("region", { name: "Past" })
      .getByRole("listitem", { name: "Behavioral · Hooli" }),
  ).toContainText("Passed");

  // Schedule a mock for later; it can't be scored yet.
  await page.getByRole("button", { name: "Add mock interview" }).click();
  await dialog.getByLabel("Date").fill(dhakaLocal(3, "00:00").slice(0, 10));
  await dialog.getByLabel("Partner / platform (optional)").fill("Pramp");
  await dialog.getByRole("group", { name: /Score/ }).getByText("4", { exact: true }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Score it after the mock.")).toBeVisible();
  await page
    .getByRole("radio", { name: "4" })
    .uncheck()
    .catch(() => {});
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add mock interview" }).click();
  await dialog.getByLabel("Date").fill(dhakaLocal(3, "00:00").slice(0, 10));
  await dialog.getByLabel("Partner / platform (optional)").fill("Pramp");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Mock interview scheduled")).toBeVisible();
  await expect(
    page.getByRole("listitem", { name: "Mock: Technical · Pramp" }).getByText("Scheduled"),
  ).toBeVisible();

  // Calendar.
  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/view=calendar/);
  const calendar = page.getByRole("region", { name: /^Calendar, / });
  await expect(calendar.getByRole("link", { name: /Behavioral · Hooli/ })).toBeVisible();
  await calendar.getByRole("link", { name: "Next month" }).click();
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  await calendar.getByRole("link", { name: "Today" }).click();
  await expect(
    page
      .getByRole("region", { name: /^Calendar, / })
      .getByRole("link", { name: /Behavioral · Hooli/ }),
  ).toBeVisible();
});
