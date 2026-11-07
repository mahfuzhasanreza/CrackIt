import { expect, type Page, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs } from "./helpers";

/**
 * Pretend to be a browser that can install the app: fire the `beforeinstallprompt` event a
 * real Chromium fires (headless never does), answering the dialog with `outcome`.
 */
const offerInstall = (page: Page, outcome: "accepted" | "dismissed") =>
  page.evaluate((outcome) => {
    const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    e.prompt = async () => {
      (window as unknown as { prompted: number }).prompted = 1;
    };
    e.userChoice = Promise.resolve({ outcome });
    window.dispatchEvent(e);
  }, outcome);

test("desktop: Install app appears only when the browser offers it, and goes once installed", async ({
  page,
}) => {
  await logInAs(page, USERS.main);
  await page.goto("/dashboard");
  const sidebar = page.locator("aside");
  const install = sidebar.getByRole("button", { name: "Install app" });
  await expect(sidebar.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(install).toHaveCount(0); // this browser can't install: nothing shown

  await offerInstall(page, "accepted");
  await expect(install).toBeVisible();
  // Sits at the bottom of the sidebar.
  const [button, aside] = await Promise.all([install.boundingBox(), sidebar.boundingBox()]);
  expect(aside!.y + aside!.height - (button!.y + button!.height)).toBeLessThan(80);

  await install.click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { prompted?: number }).prompted))
    .toBe(1);
  await expect(install).toHaveCount(0);

  // Chrome reports the installation too; a later offer after that is ignored.
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await offerInstall(page, "accepted");
  await expect(install).toHaveCount(0);
});

test("phone menu: shows it at the bottom; dismissing the dialog hides it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await logInAs(page, USERS.main);
  await page.goto("/dashboard");
  await offerInstall(page, "dismissed");

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog");
  await menu.getByRole("button", { name: "Install app" }).click();
  await expect(menu).toBeHidden(); // the menu closes after the dialog
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Install app" })).toHaveCount(
    0,
  );
});
