/** Points of an SVG path made of absolute "M x,y L x,y …" commands. */
function pathPoints(d: string): { x: number; y: number }[] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2)
    points.push({ x: nums[i], y: nums[i + 1] });
  return points;
}

export interface TrackFrame {
  /** Rotation in degrees around (cx, cy). */
  angle: number;
  cx: number;
  cy: number;
  viewBox: { x: number; y: number; width: number; height: number };
}

export function rotatePoint(
  frame: TrackFrame,
  x: number,
  y: number,
): { x: number; y: number } {
  const rad = (frame.angle * Math.PI) / 180;
  const dx = x - frame.cx;
  const dy = y - frame.cy;
  return {
    x: frame.cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: frame.cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

const ANGLE_STEP = 3;
const PADDING = 0.05;

/**
 * Rotation that lays a circuit out as wide (landscape) as possible, so it takes the least vertical space,
 * plus the tight viewBox of the rotated outline. Null for an empty path.
 */
export function landscapeFrame(d: string): TrackFrame | null {
  const points = pathPoints(d);
  if (points.length < 2) return null;
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  let best: TrackFrame | null = null;
  let bestRatio = -Infinity;
  for (let angle = 0; angle < 180; angle += ANGLE_STEP) {
    const frame: TrackFrame = {
      angle,
      cx,
      cy,
      viewBox: { x: 0, y: 0, width: 0, height: 0 },
    };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      const r = rotatePoint(frame, p.x, p.y);
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x);
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y);
    }
    const ratio = (maxX - minX) / Math.max(1, maxY - minY);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      const pad = Math.max(maxX - minX, maxY - minY) * PADDING;
      frame.viewBox = {
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + 2 * pad,
        height: maxY - minY + 2 * pad,
      };
      best = frame;
    }
  }
  return best;
}

/** First point of a path ("M x,y …"): where a sector starts. */
export function pathStart(d: string): { x: number; y: number } | null {
  return pathPoints(d)[0] ?? null;
}

/** Direction of the outline (degrees) at the point nearest to (x, y). */
export function tangentAngle(d: string, x: number, y: number): number {
  const points = pathPoints(d);
  if (points.length < 3) return 0;
  let nearest = 0;
  let best = Infinity;
  points.forEach((p, i) => {
    const dist = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (dist < best) {
      best = dist;
      nearest = i;
    }
  });
  const a = points[Math.max(0, nearest - 1)];
  const b = points[Math.min(points.length - 1, nearest + 1)];
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/**
 * Rotation that fits a circuit in the smallest square (its longest extent ends up along the diagonal),
 * plus a square viewBox around it: for thumbnails that must stay inside a fixed tile.
 */
export function squareFrame(d: string): TrackFrame | null {
  const points = pathPoints(d);
  if (points.length < 2) return null;
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  let best: TrackFrame | null = null;
  let bestSide = Infinity;
  for (let angle = 0; angle < 90; angle += ANGLE_STEP) {
    const frame: TrackFrame = {
      angle,
      cx,
      cy,
      viewBox: { x: 0, y: 0, width: 0, height: 0 },
    };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      const r = rotatePoint(frame, p.x, p.y);
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x);
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y);
    }
    const side = Math.max(maxX - minX, maxY - minY);
    if (side < bestSide) {
      bestSide = side;
      const padded = side * (1 + 2 * PADDING);
      frame.viewBox = {
        x: (minX + maxX) / 2 - padded / 2,
        y: (minY + maxY) / 2 - padded / 2,
        width: padded,
        height: padded,
      };
      best = frame;
    }
  }
  return best;
}
