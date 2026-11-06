/**
 * Clean axis ticks: 0 up to the first "nice" value (1, 2, 2.5, 5 × 10^k) at or above `max`,
 * in at most `maxIntervals` steps. `integer` keeps steps ≥ 1 (counts).
 */
export function niceTicks(max: number, { maxIntervals = 4, integer = false } = {}): number[] {
  const top = Math.max(max, integer ? 1 : Number.EPSILON);
  const raw = top / maxIntervals;
  const mag = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  if (integer) step = Math.max(1, Math.ceil(step));
  const n = Math.ceil(top / step);
  return Array.from({ length: n + 1 }, (_, i) => Math.round(i * step * 1e6) / 1e6);
}
