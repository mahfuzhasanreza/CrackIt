import { expect, type Page, test } from "@playwright/test";

import { USERS } from "./fixtures";
import { logInAs, pick } from "./helpers";

/** The notifications CrackIt currently shows (read through the service worker). */
const shown = (page: Page) =>
  page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const list = await reg.getNotifications({ tag: "crackit-timer" });
    return list.map((n) => ({ title: n.title, body: n.body, entryId: n.data?.entryId as string }));
  });

// Full Chromium (new headless): the default headless shell reports notifications as denied.
test.use({ channel: "chromium" });

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    permissions: ["notifications"],
  });

  test("timer notification: opt in, shown while running, Stop ends only that timer", async ({
    page,
  }) => {
    await logInAs(page, USERS.notify);
    await page.goto("/settings");
    const toggle = page.getByRole("switch", { name: "Show while the timer runs" });
    await toggle.click(); // asks for permission first, then turns on
    await expect(toggle).toBeChecked();

    await page.goto("/timer");
    await pick(page, "Track", "SWE / Full-Stack");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Running: Study" })).toBeVisible();

    await expect
      .poll(() => shown(page))
      .toMatchObject([
        {
          title: "Timer running: Study",
          body: expect.stringMatching(/^SWE \/ Full-Stack\nStarted \d\d:\d\d$/),
        },
      ]);
    const [{ entryId }] = await shown(page);

    // What the notification's Stop button does (the service worker calls this route).
    const stop = (id: string) =>
      page.request.post("/api/timer/stop", {
        data: { entryId: id },
        headers: { "Content-Type": "application/json" },
      });
    expect((await stop(entryId)).status()).toBe(200);
    expect((await stop(entryId)).status()).toBe(409); // already stopped: nothing else changes

    // Opening the app again clears the notification.
    await page.reload();
    await expect(header.getByRole("link", { name: "Start timer" })).toBeVisible();
    await expect.poll(() => shown(page)).toEqual([]);

    // Turning it off: a new timer shows nothing.
    await page.goto("/settings");
    await page.getByRole("switch", { name: "Show while the timer runs" }).click();
    await page.goto("/timer");
    await page.getByRole("button", { name: "Break / Gap" }).click();
    await expect(header.getByRole("link", { name: "Running: Break / Gap" })).toBeVisible();
    await page.waitForTimeout(500);
    expect(await shown(page)).toEqual([]);
    await header.getByRole("button", { name: "Stop timer" }).click();
    await expect(header.getByRole("link", { name: "Start timer" })).toBeVisible();
  });
});

test("computers don't get the setting; the stop route needs a signed-in same-origin JSON call", async ({
  page,
  request,
}) => {
  const anon = await request.post("/api/timer/stop", {
    data: { entryId: "00000000-0000-7000-8000-000000000001" },
    maxRedirects: 0,
  });
  expect(anon.status()).not.toBe(200);

  await logInAs(page, USERS.notify);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Password", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timer notification" })).toHaveCount(0);

  const crossSite = await page.request.post("/api/timer/stop", {
    data: { entryId: "00000000-0000-7000-8000-000000000001" },
    headers: { Origin: "https://evil.example" },
  });
  expect(crossSite.status()).toBe(403);
});
