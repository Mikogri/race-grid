// Lap-based derived analytics (RaceGrid derived from OpenF1 laps).
import type { Lap, PitStop } from "../api/openf1/types";
import { median } from "../lib/stats";

export interface DriverLapSummary {
  driverNumber: number;
  laps: number;
  bestLap: Lap | null;
  bestSectors: [number | null, number | null, number | null];
  /** Sum of personal best sectors — a derived "ideal lap", never actually driven. */
  idealLap: number | null;
  topSpeed: number | null;
}

const minOf = (values: (number | null)[]) => {
  const valid = values.filter((v): v is number => v != null && v > 0);
  return valid.length ? Math.min(...valid) : null;
};

export function summarizeLaps(laps: Lap[]): DriverLapSummary[] {
  const byDriver = new Map<number, Lap[]>();
  for (const lap of laps) {
    const list = byDriver.get(lap.driver_number) ?? [];
    list.push(lap);
    byDriver.set(lap.driver_number, list);
  }
  return [...byDriver.entries()].map(([driverNumber, list]) => {
    const timed = list.filter(
      (l) => l.lap_duration != null && l.lap_duration > 0,
    );
    const bestLap = timed.reduce<Lap | null>(
      (best, l) =>
        !best || (l.lap_duration ?? Infinity) < (best.lap_duration ?? Infinity)
          ? l
          : best,
      null,
    );
    const bestSectors: [number | null, number | null, number | null] = [
      minOf(list.map((l) => l.duration_sector_1)),
      minOf(list.map((l) => l.duration_sector_2)),
      minOf(list.map((l) => l.duration_sector_3)),
    ];
    const idealLap = bestSectors.every((s) => s !== null)
      ? bestSectors.reduce<number>((sum, s) => sum + (s ?? 0), 0)
      : null;
    const speeds = list
      .flatMap((l) => [l.st_speed, l.i1_speed, l.i2_speed])
      .filter((s): s is number => s != null);
    return {
      driverNumber,
      laps: list.length,
      bestLap,
      bestSectors,
      idealLap,
      topSpeed: speeds.length ? Math.max(...speeds) : null,
    };
  });
}

/**
 * Laps representative of pace: timed, not the opening lap, not pit in/out laps and within 107% of the
 * driver's median (removes SC/VSC laps, incidents and cool-down laps without needing race control data).
 */
export function cleanLaps(laps: Lap[], pits: PitStop[] = []): Lap[] {
  const pitLaps = new Set(
    pits.map((p) => `${p.driver_number}:${p.lap_number}`),
  );
  const candidate = laps.filter(
    (l) =>
      l.lap_duration != null &&
      l.lap_duration > 0 &&
      l.lap_number > 1 &&
      !l.is_pit_out_lap &&
      !pitLaps.has(`${l.driver_number}:${l.lap_number}`),
  );
  const medians = new Map<number, number>();
  for (const driver of new Set(candidate.map((l) => l.driver_number))) {
    const m = median(
      candidate
        .filter((l) => l.driver_number === driver)
        .map((l) => l.lap_duration ?? 0),
    );
    if (m !== null) medians.set(driver, m);
  }
  return candidate.filter(
    (l) =>
      (l.lap_duration ?? Infinity) <=
      (medians.get(l.driver_number) ?? Infinity) * 1.07,
  );
}

/** Median clean-lap time per driver. */
export function racePaceByDriver(
  laps: Lap[],
  pits: PitStop[] = [],
): Map<number, { median: number; laps: number }> {
  const clean = cleanLaps(laps, pits);
  const result = new Map<number, { median: number; laps: number }>();
  for (const driver of new Set(clean.map((l) => l.driver_number))) {
    const times = clean
      .filter((l) => l.driver_number === driver)
      .map((l) => l.lap_duration ?? 0);
    const m = median(times);
    if (m !== null) result.set(driver, { median: m, laps: times.length });
  }
  return result;
}
