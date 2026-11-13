export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdDev(values: number[]): number | null {
  const avg = mean(values);
  if (avg === null || values.length < 2) return null;
  return Math.sqrt(
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1),
  );
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Index of the last element with key(el) <= target in an array sorted by key; -1 if none. */
export function lastIndexAtOrBefore<T>(
  items: T[],
  target: number,
  key: (item: T) => number,
): number {
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (key(items[mid]) <= target) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export const toMs = (iso: string) => new Date(iso).getTime();
