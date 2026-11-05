import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.timer);
});

test("start study, switch to a break, stop with focus, see it on the timeline", async ({
  page,
}) => {
  const header = page.getByRole("banner");
  await page.getByRole("link", { name: "Timer", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "No timer running" })).toBeVisible();

  // Study needs a track.
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText("Required for study")).toBeVisible();

  await pick(page, "Track", "SWE / Full-Stack");
  await pick(page, "Topic (optional)", "Dynamic Programming");
  await page.getByRole("button", { name: "Start", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Study", level: 2 })).toBeVisible();
  await expect(page.getByText("SWE / Full-Stack › Dynamic Programming")).toBeVisible();
  await expect(header.getByRole("link", { name: "Running: Study" })).toBeVisible();

  // One-tap switch.
  await page.getByRole("button", { name: "Break / Gap" }).click();
  await expect(page.getByRole("heading", { name: "Break / Gap", level: 2 })).toBeVisible();
  await expect(header.getByRole("link", { name: "Running: Break / Gap" })).toBeVisible();

  // Stop from the panel with a focus rating.
  await page.getByText("4", { exact: true }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No timer running" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Start timer" })).toBeVisible();

  await page.goto("/timeline");
  await expect(page.getByRole("heading", { name: "Entries (2)" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Study · SWE \/ Full-Stack/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Break \/ Gap/ }).last()).toBeVisible();
});

test("fill a gap on a past day, reject an overlap, edit and delete", async ({ page }) => {
  await page.goto("/timeline");
  await page.getByRole("link", { name: "Previous day" }).click();
  await expect(page.getByText("Nothing tracked yet")).toBeVisible();
  const day = await page.getByLabel("Date").inputValue(); // YYYY-MM-DD

  // The whole day is one untracked block; click it to add an entry.
  await page.getByRole("button", { name: /^Untracked .* add entry$/ }).click();
  const dialog = page.getByRole("dialog");
  await pick(page, "Activity", "Sleep");
  await dialog.getByLabel("Start").fill(`${day}T04:00`);
  await dialog.getByLabel("End").fill(`${day}T10:30`);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Entry added")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entries (1)" })).toBeVisible();

  // Overlapping entry is rejected and the dialog stays open.
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  await pick(page, "Activity", "Meal");
  await dialog.getByLabel("Start").fill(`${day}T10:00`);
  await dialog.getByLabel("End").fill(`${day}T11:00`);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText(/Overlaps an existing entry \(Sleep\)/)).toBeVisible();
  await dialog.getByLabel("Start").fill(`${day}T10:30`);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Entries (2)" })).toBeVisible();

  // Edit: shorten the meal.
  await page
    .getByRole("region", { name: /Entries/ })
    .getByRole("button", { name: /Meal/ })
    .click();
  await dialog.getByLabel("End").fill(`${day}T10:45`);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Entry updated")).toBeVisible();
  await expect(page.getByText("10:30–10:45")).toBeVisible();

  // Delete it.
  await page
    .getByRole("region", { name: /Entries/ })
    .getByRole("button", { name: /Meal/ })
    .click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("heading", { name: "Entries (1)" })).toBeVisible();
});
