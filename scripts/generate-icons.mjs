/**
 * Regenerate the PWA icons in public/icons from the brand mark (lucide "target").
 *   node scripts/generate-icons.mjs public/icons
 * Uses the Playwright Chromium the e2e tests already install.
 */
import { chromium } from "@playwright/test";

const out = process.argv[2];
// lucide "target": three rings, stroke 2 on a 24 grid.
const target = (size, scale, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="${rounded ? 5.5 : 0}" fill="#171717"/>
  <g transform="translate(12 12) scale(${scale}) translate(-12 -12)" fill="none" stroke="#fafafa"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </g>
</svg>`;
const icons = [
  ["icon-192.png", 192, 0.62, true],
  ["icon-512.png", 512, 0.62, true],
  // Maskable: full-bleed, mark inside the 80% safe zone.
  ["icon-maskable-512.png", 512, 0.5, false],
  ["apple-touch-icon.png", 180, 0.6, false],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale, rounded] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${target(size, scale, rounded)}</body></html>`,
  );
  await page.locator("svg").screenshot({ path: `${out}/${name}`, omitBackground: true });
}
await browser.close();
