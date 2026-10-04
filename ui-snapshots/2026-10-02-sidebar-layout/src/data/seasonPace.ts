import { useQueries } from '@tanstack/react-query';
import type { Lap } from '../api/openf1/types';
import { racePaceByDriver } from '../analytics/laps';
import type { RoundInfo } from '../analytics/season';
import { sessionQuery } from './sessionData';

export type DriverPace = Map<number, { median: number; laps: number }>;
export type RacePaceByRound = Map<number, DriverPace>;

// One computation per downloaded lap list (the same array instance comes back from the query cache).
const paceCache = new WeakMap<Lap[], DriverPace>();
function paceOf(laps: Lap[]): DriverPace {
  let pace = paceCache.get(laps);
  if (!pace) {
    pace = racePaceByDriver(laps);
    paceCache.set(laps, pace);
  }
  return pace;
}

/**
 * Median clean race lap of every driver in every given round. Needs the full lap list of each race
 * (~0.5 MB each), so it is loaded on demand and persisted; `progress` drives the analysis loader.
 */
export function useRacePace(rounds: RoundInfo[], enabled = true) {
  const races = rounds.filter((r) => r.race && r.round !== null);
  const results = useQueries({
    queries: races.map((round) => ({
      ...sessionQuery('laps', round.race ?? { session_key: -1, date_end: '' }),
      enabled,
      staleTime: Infinity,
    })),
  });

  const pace: RacePaceByRound = new Map();
  races.forEach((round, i) => {
    const laps = results[i]?.data;
    if (laps && round.round !== null) pace.set(round.round, paceOf(laps));
  });
  const done = pace.size;

  return {
    pace,
    progress: { done, total: races.length },
    complete: done === races.length,
    error: results.find((r) => r.error)?.error ?? null,
  };
}
