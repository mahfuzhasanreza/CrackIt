import { expect, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs } from "./helpers";

test("keyboard shortcuts navigate, open help and stay out of the way while typing", async ({
  page,
}) => {
  await logInAs(page, USERS.main);

  await page.keyboard.press("g");
  await page.keyboard.press("p");
  await expect(page).toHaveURL(/\/problems$/);

  await page.keyboard.press("g");
  await page.keyboard.press("y");
  await expect(page).toHaveURL(/\/analytics$/);

  await page.keyboard.press("?");
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(help).toBeVisible();
  await expect(help.getByText("Applications")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();

  // Typing "g" + "d" into a field is just text.
  await page.goto("/settings");
  const name = page.getByLabel("Name (optional)");
  await name.fill("");
  await name.pressSequentially("gd");
  await expect(name).toHaveValue("gd");
  await expect(page).toHaveURL(/\/settings$/);

  // The account menu opens the same help.
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: /Keyboard shortcuts/ }).click();
  await expect(help).toBeVisible();
});

test("installable: manifest, icons, service worker and offline page", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const body = (await manifest.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(body).toMatchObject({ start_url: "/dashboard", display: "standalone" });
  expect(body.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(body.icons.some((i) => i.purpose === "maskable")).toBe(true);
  for (const icon of body.icons) {
    const res = await request.get(icon.src);
    expect(res.headers()["content-type"]).toBe("image/png");
  }

  // Served without a session (the proxy skips static files).
  const sw = await request.get("/sw.js", { maxRedirects: 0 });
  expect(sw.status()).toBe(200);
  expect(sw.headers()["cache-control"]).toContain("no-store");
  const offline = await request.get("/offline.html", { maxRedirects: 0 });
  expect(await offline.text()).toContain("You're offline");
});

test("the service worker registers in the production build", async ({ page }) => {
  await logInAs(page, USERS.main);
  const scope = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.scope;
  });
  expect(scope).toMatch(/\/$/);
});
