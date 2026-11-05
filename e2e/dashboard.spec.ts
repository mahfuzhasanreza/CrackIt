import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs } from "./helpers";

test("dashboard shows today, weekly goals and the 7-day chart", async ({ page }) => {
  await logInAs(page, USERS.main);
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${USERS.main.name}` }),
  ).toBeVisible();
  for (const label of ["Studied today", "Sleep today", "Untracked today", "Study streak"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("img", { name: /^Today:/ })).toBeVisible();
  await expect(page.getByRole("meter", { name: "SWE / Full-Stack weekly goal" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "University Lecturer weekly goal" })).toBeVisible();

  // Table view mirrors the chart (7 days + header).
  await page.getByText("Show as table").click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(8);

  await page.getByRole("link", { name: "Open timer" }).click();
  await expect(page).toHaveURL(/\/timer$/);
});
