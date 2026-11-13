// Snapping approximate OpenF1 locations onto the circuit reference path.
// OpenF1 location is ~3.7 Hz and noisy; projecting each sample onto the reference lap and
// interpolating along the path gives smooth, on-track motion between samples.

export interface TrackPath {
  xs: Float64Array;
  ys: Float64Array;
  progress: Float64Array;
}

export function buildTrackPath(points: [number, number, number][]): TrackPath {
  const n = points.length;
  const path: TrackPath = {
    xs: new Float64Array(n),
    ys: new Float64Array(n),
    progress: new Float64Array(n),
  };
  points.forEach(([x, y, p], i) => {
    path.xs[i] = x;
    path.ys[i] = y;
    path.progress[i] = p;
  });
  return path;
}

export interface Snap {
  progress: number;
  /** Distance from the path in SVG units (1000-unit viewBox). */
  distance: number;
}

/** Nearest point on the polyline (closing segment included). */
export function snapToPath(path: TrackPath, x: number, y: number): Snap {
  const n = path.xs.length;
  let best = Infinity;
  let bestProgress = 0;
  for (let i = 0; i < n; i++) {
    const j = i + 1 < n ? i + 1 : 0;
    const ax = path.xs[i];
    const ay = path.ys[i];
    const dx = path.xs[j] - ax;
    const dy = path.ys[j] - ay;
    const len2 = dx * dx + dy * dy;
    const t =
      len2 === 0
        ? 0
        : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < best) {
      best = d2;
      const p0 = path.progress[i];
      const p1 = j === 0 ? 1 : path.progress[j];
      bestProgress = p0 + (p1 - p0) * t;
    }
  }
  return { progress: bestProgress % 1, distance: Math.sqrt(best) };
}

/** SVG point at a lap progress 0..1. */
export function pointAtProgress(
  path: TrackPath,
  progress: number,
): [number, number] {
  const p = ((progress % 1) + 1) % 1;
  const n = path.progress.length;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path.progress[mid] <= p) lo = mid;
    else hi = mid;
  }
  if (p >= path.progress[n - 1]) {
    // closing segment back to the start
    const p0 = path.progress[n - 1];
    const t = (p - p0) / (1 - p0 || 1);
    return [
      path.xs[n - 1] + (path.xs[0] - path.xs[n - 1]) * t,
      path.ys[n - 1] + (path.ys[0] - path.ys[n - 1]) * t,
    ];
  }
  const p0 = path.progress[lo];
  const p1 = path.progress[hi];
  const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
  return [
    path.xs[lo] + (path.xs[hi] - path.xs[lo]) * t,
    path.ys[lo] + (path.ys[hi] - path.ys[lo]) * t,
  ];
}
