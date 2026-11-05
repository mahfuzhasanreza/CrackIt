import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs } from "./helpers";

const PAGES = [
  "/dashboard",
  "/timer",
  "/timeline",
  "/journal",
  "/topics",
  "/checklists",
  "/problems",
  "/projects",
  "/lecturer",
];

test("sidebar stays put and the header matches it on every page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await logInAs(page, USERS.main);
  for (const path of PAGES) {
    await page.goto(path);
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(100);
    const m = await page.evaluate(() => {
      const brandRow = document.querySelector("aside > div")!.getBoundingClientRect();
      const header = document.querySelector("header")!.getBoundingClientRect();
      return {
        sidebarTop: brandRow.top,
        brandRowHeight: brandRow.height,
        headerTop: header.top,
        headerHeight: header.height,
      };
    });
    expect(m, path).toEqual({
      sidebarTop: 0,
      brandRowHeight: 56,
      headerTop: 0,
      headerHeight: 56,
    });
  }
});

for (const width of [360, 768, 1024]) {
  test(`no sideways scrolling at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 800 });
    await logInAs(page, USERS.main);
    for (const path of PAGES) {
      await page.goto(path);
      // Measure the loaded page (the loading skeletons are checked by the first paint too).
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}
