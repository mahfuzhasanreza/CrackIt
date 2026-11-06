/** Average self-score of the latest `window` scored presentations vs the `window` before. */
export function scoreTrend(
  items: { dateKey: string; selfScore: number | null }[],
  window = 5,
): { recent: number | null; previous: number | null; count: number } {
  const scores = items
    .filter((d) => d.selfScore !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((d) => d.selfScore!);
  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
  return {
    recent: avg(scores.slice(0, window)),
    previous: avg(scores.slice(window, window * 2)),
    count: scores.length,
  };
}
