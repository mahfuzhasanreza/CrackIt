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
  "/practice",
  "/practice?tab=presentations",
  "/applications",
  "/interviews",
  "/interviews?view=calendar",
  "/resources",
  "/analytics",
  "/settings",
  "/settings?tab=tracks",
  "/settings?tab=data",
  "/resources?view=done",
  "/applications?view=organizations",
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

      // Tab bars may swipe sideways but must never overflow vertically: that shows stray
      // scrollbar arrows on systems with classic scrollbars.
      const tallNavs = await page.evaluate(() =>
        [...document.querySelectorAll("main nav")]
          .filter((n) => n.scrollHeight > n.clientHeight)
          .map((n) => n.getAttribute("aria-label")),
      );
      expect(tallNavs, path).toEqual([]);
    }
  });
}

test("phone menu scrolls only when it doesn't fit", async ({ page }) => {
  await logInAs(page, USERS.main);
  const menuScrolls = () =>
    page.getByRole("dialog").evaluate((d) => {
      const list = d.querySelector(".overflow-y-auto")!;
      return list.scrollHeight > list.clientHeight;
    });

  // A tall phone: everything fits, nothing to scroll.
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open menu" }).click();
  expect(await menuScrolls()).toBe(false);
  await page.keyboard.press("Escape");

  // A short phone (or landscape): the menu scrolls and the last item is reachable.
  await page.setViewportSize({ width: 390, height: 500 });
  await page.getByRole("button", { name: "Open menu" }).click();
  expect(await menuScrolls()).toBe(true);
  await page.getByRole("dialog").getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings/);
});
