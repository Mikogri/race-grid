import type { LocationRecord } from '../../api/openf1/types';
import { lastIndexAtOrBefore, toMs } from '../../lib/stats';
import { pointAtProgress, snapToPath, type TrackPath } from './trackPath';

export interface CarSample {
  ms: number;
  x: number;
  y: number;
  progress: number;
  /** False in the pit lane or wherever the sample is far from the reference lap. */
  onTrack: boolean;
}

export interface SvgTransform {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
}

/** Samples further than this (SVG units of a 1000 viewBox) are drawn raw instead of snapped. */
const SNAP_THRESHOLD = 10;
/** Longer gaps between samples mean missing data: hold the car instead of sliding across the map. */
const MAX_INTERPOLATION_MS = 4000;

export function buildCarSamples(records: LocationRecord[], transform: SvgTransform, path: TrackPath | null): Map<number, CarSample[]> {
  const byDriver = new Map<number, CarSample[]>();
  for (const r of records) {
    if (r.x === 0 && r.y === 0) continue; // car not transmitting
    const x = r.x * transform.scaleX + transform.translateX;
    const y = r.y * transform.scaleY + transform.translateY;
    const snap = path ? snapToPath(path, x, y) : null;
    const list = byDriver.get(r.driver_number) ?? [];
    list.push({ ms: toMs(r.date), x, y, progress: snap?.progress ?? 0, onTrack: snap !== null && snap.distance <= SNAP_THRESHOLD });
    byDriver.set(r.driver_number, list);
  }
  for (const list of byDriver.values()) list.sort((a, b) => a.ms - b.ms);
  return byDriver;
}

export interface CarPoint {
  x: number;
  y: number;
  /** No sample close to this moment (data gap or chunk still loading). */
  stale: boolean;
}

export function carPointAt(samples: CarSample[], ms: number, path: TrackPath | null): CarPoint | null {
  const i = lastIndexAtOrBefore(samples, ms, (s) => s.ms);
  if (i < 0) return null;
  const a = samples[i];
  const b = samples[i + 1];
  if (!b || b.ms - a.ms > MAX_INTERPOLATION_MS) return { x: a.x, y: a.y, stale: ms - a.ms > MAX_INTERPOLATION_MS };
  const f = (ms - a.ms) / (b.ms - a.ms);
  if (path && a.onTrack && b.onTrack) {
    let dp = b.progress - a.progress;
    if (dp < -0.5) dp += 1; // crossed the start/finish line
    if (dp > 0.5) dp -= 1;
    const [x, y] = pointAtProgress(path, a.progress + dp * f);
    return { x, y, stale: false };
  }
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, stale: false };
}

/**
 * Fallback when the local library has no outline for this circuit/year: fit OpenF1 coordinates
 * into the 1000-unit viewBox (Y flipped) from the observed bounding box.
 */
export function fitTransform(records: LocationRecord[]): SvgTransform | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const r of records) {
    if (r.x === 0 && r.y === 0) continue;
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x);
    minY = Math.min(minY, r.y);
    maxY = Math.max(maxY, r.y);
  }
  if (!Number.isFinite(minX) || maxX === minX || maxY === minY) return null;
  const margin = 40;
  const scale = Math.min((1000 - 2 * margin) / (maxX - minX), (1000 - 2 * margin) / (maxY - minY));
  return {
    scaleX: scale,
    scaleY: -scale,
    translateX: 500 - ((minX + maxX) / 2) * scale,
    translateY: 500 + ((minY + maxY) / 2) * scale,
  };
}

/** Trail of one driver over one lap, used as a reconstructed outline when no local outline exists. */
export function trailPath(samples: CarSample[], fromMs: number, toMs: number): string {
  return samples
    .filter((s) => s.ms >= fromMs && s.ms <= toMs)
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${s.x.toFixed(1)},${s.y.toFixed(1)}`)
    .join('');
}
