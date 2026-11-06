import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.analytics);
});

test("charts follow the date range and every chart has a table view", async ({ page }) => {
  await page.getByRole("link", { name: "Analytics", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Last 30 days" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const kpis = page.getByRole("definition").filter({ hasText: /^6h 00m$/ });
  await expect(kpis.first()).toBeVisible(); // 3 × 2h of study

  await page.getByRole("link", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/range=7d/);
  const study = page.getByRole("region", { name: "Study time" });
  await study.getByText("Show as table").click();
  await expect(study.getByRole("row")).toHaveCount(8); // header + 7 days

  await expect(
    page.getByRole("region", { name: "Where study time went" }).getByText("SWE / Full-Stack"),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: /^Sleep per night/ })).toBeVisible();
  await expect(page.getByRole("group", { name: /^Focus rating/ })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Application funnel" }).getByText(/No applications sent/),
  ).toBeVisible();

  const heatmap = page.getByRole("region", { name: "Study heatmap" });
  await expect(heatmap.getByText(/over 3 days/)).toBeVisible();
});

test("a goal shows this period against its target", async ({ page }) => {
  await page.goto("/analytics");
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Add goal" }).click();
  await pick(page, "Period", "Per day");
  await dialog.getByLabel("Target (hours)").fill("1.5");
  await pick(page, "Track (optional)", "SWE / Full-Stack");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Goal added")).toBeVisible();

  const goal = page.getByRole("article", { name: "1h 30m of SWE / Full-Stack study a day" });
  await expect(goal.getByRole("meter")).toBeVisible();
  await expect(goal.getByText("Today")).toBeVisible();

  await page
    .getByRole("button", { name: "Actions for 1h 30m of SWE / Full-Stack study a day" })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Goal deleted")).toBeVisible();
  await expect(goal).toBeHidden();
});
