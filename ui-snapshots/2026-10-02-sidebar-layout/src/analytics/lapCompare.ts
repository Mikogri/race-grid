// Lap comparison on a common "lap progress" axis. OpenF1 car_data has no distance channel, so
// distance is integrated from speed over time and normalised to 0..1 — a RaceGrid derivation.
import type { CarDataRecord, Lap } from '../api/openf1/types';
import { toMs } from '../lib/stats';
import { isDrsOpen } from '../lib/telemetry';

export interface TracePoint {
  /** 0..1 along the lap (derived). */
  progress: number;
  /** Seconds since the start of the lap. */
  time: number;
  speed: number;
  throttle: number;
  brake: number;
  rpm: number;
  gear: number;
  drs: number;
}

export interface LapTrace {
  lap: Lap;
  distanceMetres: number;
  points: TracePoint[];
}

export function buildTrace(lap: Lap, samples: CarDataRecord[]): LapTrace | null {
  if (!lap.date_start || !lap.lap_duration) return null;
  const start = toMs(lap.date_start);
  const end = start + lap.lap_duration * 1000;
  const inLap = samples.filter((s) => {
    const ms = toMs(s.date);
    return ms >= start && ms <= end;
  });
  if (inLap.length < 20) return null;

  let metres = 0;
  const raw = inLap.map((s, i) => {
    if (i > 0) {
      const dt = (toMs(s.date) - toMs(inLap[i - 1].date)) / 1000;
      if (dt > 0 && dt < 2) metres += ((s.speed + inLap[i - 1].speed) / 2 / 3.6) * dt;
    }
    return { metres, s };
  });
  if (metres <= 0) return null;
  return {
    lap,
    distanceMetres: metres,
    points: raw.map(({ metres: m, s }) => ({
      progress: m / metres,
      time: (toMs(s.date) - start) / 1000,
      speed: s.speed,
      throttle: Math.min(100, s.throttle),
      brake: s.brake > 0 ? 1 : 0,
      rpm: s.rpm,
      gear: s.n_gear,
      drs: isDrsOpen(s.drs) ? 1 : 0,
    })),
  };
}

/** Time (s) at which a trace reached a progress value (linear interpolation). */
function timeAt(points: TracePoint[], progress: number): number | null {
  let lo = 0;
  let hi = points.length - 1;
  if (progress <= points[0].progress) return points[0].time;
  if (progress >= points[hi].progress) return points[hi].time;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].progress < progress) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const f = b.progress === a.progress ? 0 : (progress - a.progress) / (b.progress - a.progress);
  return a.time + (b.time - a.time) * f;
}

/** Cumulative time difference vs a reference lap along lap progress (positive = slower than reference). */
export function deltaTrace(reference: LapTrace, other: LapTrace, steps = 300): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const tr = timeAt(reference.points, p);
    const to = timeAt(other.points, p);
    if (tr !== null && to !== null) out.push({ x: p * 100, y: to - tr });
  }
  // Integration drift: spread the difference to the official lap-time gap linearly over the lap,
  // so the line ends exactly on the timed difference without a step at the finish.
  const official = (other.lap.lap_duration ?? 0) - (reference.lap.lap_duration ?? 0);
  const drift = out.length ? official - out[out.length - 1].y : 0;
  return out.map((point) => ({ x: point.x, y: point.y + (drift * point.x) / 100 }));
}
