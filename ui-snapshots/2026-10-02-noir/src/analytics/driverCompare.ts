// Driver vs driver (same or different seasons) from season models. RaceGrid derived.
import { summarize } from './driverStats';
import { fieldBestByRound, qualifyingGapPercent } from './qualifying';
import type { DriverRoundResult, SeasonModel } from './season';
import { median, stdDev } from '../lib/stats';

export interface CompareSide {
  season: SeasonModel;
  driverNumber: number;
}

export interface AlignedEvent {
  key: string;
  label: string;
  a: DriverRoundResult | null;
  b: DriverRoundResult | null;
}

/**
 * Same season: events are rounds. Different seasons: events are circuits (first visit per season),
 * so "common" means circuits both drivers raced at in their seasons.
 */
export function alignEvents(a: CompareSide, b: CompareSide, commonOnly: boolean): AlignedEvent[] {
  const ra = a.season.results.get(a.driverNumber) ?? [];
  const rb = b.season.results.get(b.driverNumber) ?? [];
  const sameSeason = a.season.year === b.season.year;
  const keyOf = (r: DriverRoundResult) => (sameSeason ? `r${r.round}` : `c${r.circuitKey}`);
  const labelOf = (season: SeasonModel, r: DriverRoundResult) => {
    const round = season.rounds.find((x) => x.round === r.round);
    return sameSeason ? `R${r.round} ${round?.meeting.location ?? ''}` : (round?.meeting.circuit_short_name ?? `Circuit ${r.circuitKey}`);
  };

  const events = new Map<string, AlignedEvent>();
  for (const r of ra) if (!events.has(keyOf(r))) events.set(keyOf(r), { key: keyOf(r), label: labelOf(a.season, r), a: r, b: null });
  for (const r of rb) {
    const existing = events.get(keyOf(r));
    if (existing && !existing.b) existing.b = r;
    else if (!existing) events.set(keyOf(r), { key: keyOf(r), label: labelOf(b.season, r), a: null, b: r });
  }
  const list = [...events.values()];
  return commonOnly ? list.filter((e) => e.a && e.b) : list;
}

export interface CompareMetrics {
  events: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  pointsPerEvent: number | null;
  medianGrid: number | null;
  medianFinish: number | null;
  avgGained: number | null;
  dnf: number;
  /** Median qualifying gap to the fastest lap of each event, %. */
  qualifyingGap: number | null;
  /** Standard deviation of finishing position (classified finishes). Lower = more consistent. */
  consistency: number | null;
  /** Median race pace gap to the fastest driver, %; null until race pace is loaded. */
  racePaceGap: number | null;
}

export function metricsFor(season: SeasonModel, results: DriverRoundResult[], paceGaps: number[] | null): CompareMetrics {
  const s = summarize(results);
  const fieldBest = fieldBestByRound(season);
  const points = s.racePoints + s.sprintPoints;
  return {
    events: results.length,
    wins: s.wins,
    podiums: s.podiums,
    poles: s.poles,
    points,
    pointsPerEvent: results.length ? points / results.length : null,
    medianGrid: s.medianGrid,
    medianFinish: s.medianFinish,
    avgGained: s.avgPositionsGained,
    dnf: s.dnf,
    qualifyingGap: median(results.map((r) => qualifyingGapPercent(r, fieldBest)).filter((g): g is number => g !== null)),
    consistency: stdDev(results.map((r) => r.finish).filter((f): f is number => f !== null)),
    racePaceGap: paceGaps ? median(paceGaps) : null,
  };
}
