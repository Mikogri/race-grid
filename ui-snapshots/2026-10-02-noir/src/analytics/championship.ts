// Championship outlook for the standings summary. Pure functions over the season model.
import { toMs } from '../lib/stats';
import type { DriverRoundResult, SeasonModel } from './season';

const RACE_WIN_POINTS = 25;
const SPRINT_WIN_POINTS = 8;
/** 2019–2024 awarded one extra point for the fastest lap (top-10 finishers). */
const hasFastestLapPoint = (year: number) => year >= 2019 && year <= 2024;

export interface ChampionshipOutlook {
  totalRounds: number;
  remainingRaces: number;
  remainingSprints: number;
  /** Most points one driver can still score. */
  pointsAvailable: number;
  /** Drivers who can still mathematically reach the leader. */
  contenders: number;
}

export function championshipOutlook(season: SeasonModel, now = Date.now()): ChampionshipOutlook {
  const completed = new Set(season.completedRounds);
  const grandPrix = season.rounds.filter((r) => r.round !== null && r.status !== 'cancelled');
  const remainingRaces = grandPrix.filter((r) => !completed.has(r)).length;
  const remainingSprints = grandPrix.filter((r) => r.sprint && toMs(r.sprint.date_start) > now).length;
  const perRace = RACE_WIN_POINTS + (hasFastestLapPoint(season.year) ? 1 : 0);
  const pointsAvailable = remainingRaces * perRace + remainingSprints * SPRINT_WIN_POINTS;
  const leaderPoints = season.driverStandings[0]?.points ?? 0;
  return {
    totalRounds: grandPrix.length,
    remainingRaces,
    remainingSprints,
    pointsAvailable,
    contenders: season.driverStandings.filter((s) => s.points + pointsAvailable >= leaderPoints).length,
  };
}

/** Last `count` Grand Prix results, oldest first, as P1 / DNF / DNS / DSQ / NC. */
export function recentForm(results: DriverRoundResult[], count = 5): string[] {
  return results.slice(-count).map((r) => {
    if (r.status === 'finished') return r.finish !== null ? `P${r.finish}` : 'NC';
    return r.status.toUpperCase();
  });
}
