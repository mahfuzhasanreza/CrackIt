import { expect, type Locator, type Page, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await logInAs(page, USERS.jobs);
});

/** Drag with the mouse (dnd-kit needs a few intermediate moves past its 6px threshold). */
async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + 20, a.y + a.height - 8);
  await page.mouse.down();
  await page.mouse.move(a.x + 40, a.y + a.height, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + 60, { steps: 15 });
  await page.mouse.up();
}

test("kanban: add, drag, move, interview moves it forward, history", async ({ page }) => {
  await page.getByRole("link", { name: "Applications", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Applications", level: 1 })).toBeVisible();
  const dialog = page.getByRole("dialog");

  await page.getByRole("button", { name: "Add application", exact: true }).click();
  await dialog.getByLabel("Organization").fill("Acme Corp");
  await dialog.getByLabel("Role").fill("Software Engineer");
  await pick(page, "Track (optional)", "SWE / Full-Stack");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Application added")).toBeVisible();

  const column = (name: string) => page.getByRole("region", { name: new RegExp(`^${name} \\(`) });
  // dnd-kit gives each draggable card role="button".
  const card = page.getByRole("button", { name: "Software Engineer at Acme Corp", exact: true });
  await expect(column("Wishlist").locator(card)).toBeVisible();

  // Drag Wishlist → Applied.
  await drag(page, card, column("Applied"));
  await expect(page.getByText("Moved to Applied")).toBeVisible();
  await expect(column("Applied").locator(card)).toBeVisible();
  await page.reload();
  await expect(column("Applied").locator(card)).toBeVisible();

  // Keyboard-free alternative: the card's menu.
  await page.getByRole("button", { name: "Actions for Software Engineer at Acme Corp" }).click();
  await page.getByRole("menuitem", { name: "Move to" }).click();
  await page.getByRole("menuitem", { name: "Online assessment" }).click();
  await expect(column("Online assessment").locator(card)).toBeVisible();

  // Open the detail page and add a technical interview → Interviewing.
  await page.getByRole("link", { name: "Software Engineer" }).click();
  await expect(page.getByRole("heading", { name: "Software Engineer", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Add interview" }).click();
  await pick(page, "Round", "Technical");
  await dialog.getByLabel("Interviewer(s) (optional)").fill("Jane");
  await dialog
    .getByLabel("Questions asked (Markdown) (optional)")
    .fill("- Design an **LRU cache**");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("application moved to Interviewing")).toBeVisible();

  const history = page.getByRole("region", { name: "History" });
  await expect(history.getByText("Added to Wishlist")).toBeVisible();
  await expect(history.getByText("Moved to Applied")).toBeVisible();
  await expect(history.getByText("Moved to Online assessment")).toBeVisible();
  await expect(history.getByText("Moved to Interviewing")).toBeVisible();

  // The interview's own page shows the notes.
  await page
    .getByRole("listitem", { name: "Technical" })
    .getByRole("link", { name: "Technical" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Technical · Acme Corp", level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Questions asked" })
      .locator("strong", { hasText: "LRU cache" }),
  ).toBeVisible();

  // It shows up as upcoming on the interviews page and the dashboard.
  await page.getByRole("link", { name: "Interviews", exact: true }).first().click();
  await expect(
    page
      .getByRole("region", { name: /^Upcoming/ })
      .getByRole("listitem", { name: "Technical · Acme Corp" }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Acme Corp · Technical" })).toBeVisible();
});

test("mock interviews and organizations", async ({ page }) => {
  await page.goto("/interviews");
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Add mock interview" }).click();
  await pick(page, "Type", "System design");
  await dialog.getByLabel("Partner / platform (optional)").fill("Pramp");
  await dialog.getByRole("group", { name: /Score/ }).getByText("3", { exact: true }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Mock interview logged")).toBeVisible();
  await expect(page.getByRole("heading", { name: "System design · Pramp" })).toBeVisible();

  await page.goto("/applications");
  await page.getByRole("button", { name: "Add application", exact: true }).click();
  await dialog.getByLabel("Organization").fill("Globex University");
  await pick(page, "Type", "University");
  await dialog.getByLabel("Role").fill("Lecturer, CSE");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Application added")).toBeVisible();

  await page.getByRole("link", { name: /^Organizations/ }).click();
  await expect(page.getByRole("heading", { name: "Globex University" })).toBeVisible();
  await page.getByRole("button", { name: "Actions for Globex University" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await dialog.getByLabel("Location (optional)").fill("Dhaka");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Organization saved")).toBeVisible();
  await expect(page.getByText("Dhaka")).toBeVisible();
});

test("kanban: columns wrap and cards fit, no sideways scrolling", async ({ page }) => {
  await page.goto("/applications");
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Add application", exact: true }).click();
  await dialog.getByLabel("Organization").fill("Supercalifragilisticexpialidocious Technologies");
  await dialog.getByLabel("Role").fill("Principal Distributed Systems Reliability Engineer");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Application added")).toBeVisible();

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const sizes = await page.evaluate(() => {
      const main = document.querySelector("main")!.getBoundingClientRect();
      const regions = [...document.querySelectorAll("main section[aria-label]")];
      return {
        page: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        outside: regions.filter((r) => {
          const b = r.getBoundingClientRect();
          return b.left < main.left || b.right > main.right + 0.5;
        }).length,
        overflowing: [...document.querySelectorAll("main section[aria-label] li")].filter(
          (c) => c.scrollWidth > c.clientWidth,
        ).length,
        columns: regions.length,
      };
    });
    expect(sizes, `${width}px`).toEqual({ page: 0, outside: 0, overflowing: 0, columns: 7 });
  }
});
