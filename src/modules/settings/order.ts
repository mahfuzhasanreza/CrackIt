/** Swap with the neighbour above/below. */
export function moved<T extends { id: string }>(
  rows: T[],
  id: string,
  direction: "up" | "down",
): T[] | null {
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return null;
  const next = [...rows];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}
