/**
 * Validated categorical chart palette (dataviz reference palette, July/Aug 2026).
 * Checked with the palette validator: adjacent pairs pass CVD ΔE ≥ 8 and normal-vision ΔE ≥ 15
 * in both modes; slots 1–3 pass all-pairs. Light values are what we store (e.g. track.color);
 * dark values are the same hues re-stepped for the dark surface — never an automatic flip.
 * Assign slots in order; never cycle past 8 (fold extra series into "Other").
 */
export const SERIES = [
  { name: "blue", light: "#2a78d6", dark: "#3987e5" },
  { name: "orange", light: "#eb6834", dark: "#d95926" },
  { name: "aqua", light: "#1baf7a", dark: "#199e70" },
  { name: "yellow", light: "#eda100", dark: "#c98500" },
  { name: "magenta", light: "#e87ba4", dark: "#d55181" },
  { name: "green", light: "#008300", dark: "#008300" },
  { name: "violet", light: "#6250d6", dark: "#9085e9" },
  { name: "red", light: "#e34948", dark: "#e66767" },
] as const;

/** Neutral for "everything else" (breaks, meals, other) — identity comes from its label. */
export const NEUTRAL = { light: "#a8a7a1", dark: "#6b6a64" } as const;
/** Sleep gets the violet slot everywhere so it reads the same across charts. */
export const SLEEP = SERIES[6];

const darkByLight = new Map<string, string>(SERIES.map((s) => [s.light.toLowerCase(), s.dark]));

/** Dark-mode step for a stored (light) color; unknown custom colors are used as-is. */
export function darkOf(hex: string): string {
  return darkByLight.get(hex.toLowerCase()) ?? hex;
}

/**
 * Inline CSS variables for a series color. Pair with the `bg-series` / `border-series`
 * classes (see globals.css) so light/dark swap with the theme.
 */
export function seriesVars(light: string, dark = darkOf(light)): React.CSSProperties {
  return { "--series": light, "--series-dark": dark } as React.CSSProperties;
}
