// RaceGrid Benchmarks: best values observed in the OpenF1 laps we load for a circuit.
// They are bounded by OpenF1 coverage (2023+) and are not official lap records.
import type { Lap } from '../api/openf1/types';

export interface BenchmarkSource {
  year: number;
  sessionName: string;
  laps: Lap[];
  acronymOf: (driverNumber: number) => string;
}

export interface Benchmark {
  label: string;
  value: number;
  unit: 'time' | 'kmh';
  driver: string;
  year: number;
  sessionName: string;
  lapNumber: number;
}

type Pick = (lap: Lap) => number | null;

function best(sources: BenchmarkSource[], pick: Pick, mode: 'min' | 'max'): Omit<Benchmark, 'label' | 'unit'> | null {
  let winner: Omit<Benchmark, 'label' | 'unit'> | null = null;
  for (const source of sources) {
    for (const lap of source.laps) {
      const value = pick(lap);
      if (value == null || !Number.isFinite(value) || value <= 0) continue;
      if (!winner || (mode === 'min' ? value < winner.value : value > winner.value)) {
        winner = { value, driver: source.acronymOf(lap.driver_number), year: source.year, sessionName: source.sessionName, lapNumber: lap.lap_number };
      }
    }
  }
  return winner;
}

const maxSpeed: Pick = (lap) => {
  const speeds = [lap.st_speed, lap.i1_speed, lap.i2_speed].filter((s): s is number => s != null);
  return speeds.length ? Math.max(...speeds) : null;
};

export function computeBenchmarks(qualifying: BenchmarkSource[], race: BenchmarkSource[]): Benchmark[] {
  const all = [...qualifying, ...race];
  const rows: (Benchmark | null)[] = [
    withMeta('Fastest qualifying lap', 'time', best(qualifying, (l) => l.lap_duration, 'min')),
    withMeta('Fastest race lap', 'time', best(race, (l) => l.lap_duration, 'min')),
    withMeta('Highest speed-trap reading', 'kmh', best(all, maxSpeed, 'max')),
    withMeta('Fastest sector 1', 'time', best(all, (l) => l.duration_sector_1, 'min')),
    withMeta('Fastest sector 2', 'time', best(all, (l) => l.duration_sector_2, 'min')),
    withMeta('Fastest sector 3', 'time', best(all, (l) => l.duration_sector_3, 'min')),
  ];
  return rows.filter((row): row is Benchmark => row !== null);
}

function withMeta(label: string, unit: Benchmark['unit'], found: Omit<Benchmark, 'label' | 'unit'> | null): Benchmark | null {
  return found ? { label, unit, ...found } : null;
}

/** Observed lap distance: integrate speed (km/h) over time for one lap of car_data. Derived, approximate. */
export function integrateDistanceKm(samples: { date: string; speed: number }[]): number | null {
  if (samples.length < 10) return null;
  let metres = 0;
  for (let i = 1; i < samples.length; i++) {
    const dt = (new Date(samples[i].date).getTime() - new Date(samples[i - 1].date).getTime()) / 1000;
    if (dt <= 0 || dt > 2) continue;
    const avgSpeed = (samples[i].speed + samples[i - 1].speed) / 2 / 3.6;
    metres += avgSpeed * dt;
  }
  return metres / 1000;
}
