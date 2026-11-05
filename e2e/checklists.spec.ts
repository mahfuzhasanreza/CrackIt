import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.checklists);
});

test("create a daily habit, tick it on the dashboard and see the streak", async ({ page }) => {
  await page.getByRole("link", { name: "Checklists", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Checklists", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "New checklist" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Habits", { exact: true }).click();
  await dialog.getByLabel("Title").fill("Morning routine");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Checklist created")).toBeVisible();

  const list = page.getByRole("region", { name: "Morning routine" });
  await list.getByLabel("New item in Morning routine").fill("Solve 1 LeetCode problem");
  await list.getByRole("button", { name: "Add to Morning routine" }).click();
  await expect(list.getByRole("checkbox", { name: "Solve 1 LeetCode problem" })).toBeVisible();
  // The add box clears for the next item.
  await expect(list.getByLabel("New item in Morning routine")).toHaveValue("");

  // Tick it from the dashboard.
  await page.goto("/dashboard");
  const today = page.getByRole("region", { name: "Habits" });
  const habit = today.getByRole("checkbox", { name: "Solve 1 LeetCode problem" });
  await expect(habit).not.toBeChecked();
  await habit.check();
  await expect(habit).toBeChecked();
  await page.reload();
  await expect(today.getByRole("checkbox", { name: "Solve 1 LeetCode problem" })).toBeChecked();
  await expect(today.getByText("1/1")).toBeVisible();

  // Back on the checklists page: done today, streak 1.
  await page.goto("/checklists");
  await expect(list.getByRole("checkbox", { name: "Solve 1 LeetCode problem" })).toBeChecked();
  await expect(list.getByRole("img", { name: "Done 1 of the last 7" })).toBeVisible();
});

test("to-do list with a due date shows up on the dashboard until ticked", async ({ page }) => {
  await page.goto("/checklists");
  await page.getByRole("button", { name: "New checklist" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("To-do list", { exact: true }).click();
  await dialog.getByLabel("Title").fill("Applications");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Checklist created")).toBeVisible();

  const list = page.getByRole("region", { name: "Applications" });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(
    new Date(Date.now() - 4 * 3600_000), // the app's day starts at 04:00
  );
  await list.getByLabel("New item in Applications").fill("Send CV to Acme");
  await list.getByLabel("Due date (optional)").fill(today);
  await list.getByRole("button", { name: "Add to Applications" }).click();
  await expect(list.getByText("Due today")).toBeVisible();

  // Edit: raise the priority.
  await list.getByRole("button", { name: "Actions for Send CV to Acme" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Priority").click();
  await page.getByRole("option", { name: "Urgent" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Item saved")).toBeVisible();
  await expect(list.getByText("Urgent")).toBeVisible();

  await page.goto("/dashboard");
  const due = page.getByRole("region", { name: "Due" });
  await due.getByRole("checkbox", { name: "Send CV to Acme" }).check();
  await expect(due.getByRole("checkbox", { name: "Send CV to Acme" })).toBeChecked();

  // Delete the list.
  await page.goto("/checklists");
  await list.getByRole("button", { name: "Actions for Applications" }).click();
  await page.getByRole("menuitem", { name: "Delete list" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Checklist deleted")).toBeVisible();
  await expect(list).toBeHidden();
});
