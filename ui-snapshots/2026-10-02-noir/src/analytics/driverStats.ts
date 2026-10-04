// Counting stats derived from per-round results (RaceGrid derived, based on OpenF1 session_result/starting_grid).
import type { DriverRoundResult, SeasonModel } from './season';
import { mean, median } from '../lib/stats';

export interface DriverSummary {
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  pointsFinishes: number;
  dnf: number;
  dns: number;
  dsq: number;
  bestFinish: number | null;
  medianGrid: number | null;
  medianFinish: number | null;
  /** Average of grid − finish over rounds where both are known (positive = gained). */
  avgPositionsGained: number | null;
  racePoints: number;
  sprintPoints: number;
}

export function summarize(results: DriverRoundResult[]): DriverSummary {
  const started = results.filter((r) => r.status !== 'dns');
  const finishes = results.map((r) => r.finish).filter((p): p is number => p !== null);
  const grids = results.map((r) => r.grid).filter((p): p is number => p !== null);
  const gained = results.filter((r) => r.grid !== null && r.finish !== null).map((r) => (r.grid ?? 0) - (r.finish ?? 0));
  return {
    starts: started.length,
    wins: results.filter((r) => r.finish === 1).length,
    podiums: results.filter((r) => r.finish !== null && r.finish <= 3).length,
    poles: results.filter((r) => r.qualifyingPosition === 1).length,
    pointsFinishes: results.filter((r) => r.points > 0).length,
    dnf: results.filter((r) => r.status === 'dnf').length,
    dns: results.filter((r) => r.status === 'dns').length,
    dsq: results.filter((r) => r.status === 'dsq').length,
    bestFinish: finishes.length ? Math.min(...finishes) : null,
    medianGrid: median(grids),
    medianFinish: median(finishes),
    avgPositionsGained: mean(gained),
    racePoints: results.reduce((sum, r) => sum + r.points, 0),
    sprintPoints: results.reduce((sum, r) => sum + r.sprintPoints, 0),
  };
}

/** Driver numbers that drove for a team in the season (from per-round entries, not just final identity). */
export function teamDriverNumbers(season: SeasonModel, teamName: string): number[] {
  const numbers = new Set<number>();
  for (const [driverNumber, results] of season.results) {
    if (results.some((r) => r.teamName === teamName)) numbers.add(driverNumber);
  }
  return [...numbers];
}

export interface HeadToHead {
  rounds: number;
  qualifyingA: number;
  qualifyingB: number;
  raceA: number;
  raceB: number;
  /** Median of (A − B) qualifying time in seconds, compared in the last phase both drivers set a time. */
  medianQualifyingGap: number | null;
  pointsA: number;
  pointsB: number;
}

/** A − B in the highest qualifying phase (Q3 > Q2 > Q1) where both have a lap time. */
export function samePhaseGap(a: (number | null)[], b: (number | null)[]): number | null {
  for (let phase = Math.min(a.length, b.length) - 1; phase >= 0; phase--) {
    const ta = a[phase];
    const tb = b[phase];
    if (ta != null && tb != null) return ta - tb;
  }
  return null;
}

/** Teammate-style head-to-head over rounds where both drivers took part. */
export function headToHead(a: DriverRoundResult[], b: DriverRoundResult[]): HeadToHead {
  const bByRound = new Map(b.map((r) => [r.round, r]));
  const shared = a.filter((r) => bByRound.has(r.round));
  let qualifyingA = 0;
  let qualifyingB = 0;
  let raceA = 0;
  let raceB = 0;
  const gaps: number[] = [];
  for (const ra of shared) {
    const rb = bByRound.get(ra.round);
    if (!rb) continue;
    if (ra.qualifyingPosition !== null && rb.qualifyingPosition !== null) {
      if (ra.qualifyingPosition < rb.qualifyingPosition) qualifyingA++;
      else qualifyingB++;
    }
    // A classified finish beats a retirement; two retirements count for nobody.
    const fa = ra.finish ?? Infinity;
    const fb = rb.finish ?? Infinity;
    if (fa < fb) raceA++;
    else if (fb < fa) raceB++;
    const gap = samePhaseGap(ra.qualifyingPhases, rb.qualifyingPhases);
    if (gap !== null) gaps.push(gap);
  }
  return {
    rounds: shared.length,
    qualifyingA,
    qualifyingB,
    raceA,
    raceB,
    medianQualifyingGap: median(gaps),
    pointsA: shared.reduce((s, r) => s + r.points + r.sprintPoints, 0),
    pointsB: shared.reduce((s, r) => s + (bByRound.get(r.round)?.points ?? 0) + (bByRound.get(r.round)?.sprintPoints ?? 0), 0),
  };
}
