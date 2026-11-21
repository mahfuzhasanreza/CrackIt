import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { DEMO_USER } from "./demo-user";

const OUT = path.resolve(__dirname, "../../docs/screenshots");

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Desktop pages: [file name, URL, optional region to scroll to]. */
const PAGES: [string, string, string?][] = [
  ["dashboard", "/dashboard"],
  ["applications-board", "/applications?view=board"],
  ["analytics", "/analytics?range=90d"],
  ["analytics-charts", "/analytics?range=90d", "Study time"],
  ["timeline", "/timeline"],
  ["topics", "/topics"],
  ["problems", "/problems"],
  ["interviews-calendar", "/interviews?view=calendar"],
  ["journal", "/journal"],
];

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_USER.email);
  await page.getByLabel("Password").fill(DEMO_USER.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function shoot(page: Page, name: string, url: string, region?: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  if (region) {
    const target = page.getByRole("region", { name: region, exact: true }).first();
    await target.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, -80)); // clear the sticky header
  }
  await page.mouse.move(0, 0); // no hover states
  await page.screenshot({ path: path.join(OUT, `${name}.png`), animations: "disabled" });
}

test.describe("light", () => {
  test.use({ viewport: DESKTOP, colorScheme: "light" });

  test("desktop pages", async ({ page }) => {
    await logIn(page);
    for (const [name, url, region] of PAGES) await shoot(page, name, url, region);
  });
});

test.describe("dark", () => {
  test.use({ viewport: DESKTOP, colorScheme: "dark" });

  test("dashboard", async ({ page }) => {
    await logIn(page);
    await shoot(page, "dashboard-dark", "/dashboard");
  });
});

test.describe("phone", () => {
  test.use({ viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("dashboard", async ({ page }) => {
    await logIn(page);
    await shoot(page, "phone-dashboard", "/dashboard");
  });
});
