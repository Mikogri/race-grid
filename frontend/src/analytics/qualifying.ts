// Qualifying pace derived from OpenF1 qualifying session_result (best lap per phase).
import type { DriverRoundResult, SeasonModel } from "./season";

export const bestQualifyingTime = (
  result: DriverRoundResult,
): number | null => {
  const times = result.qualifyingPhases.filter(
    (t): t is number => t != null && t > 0,
  );
  return times.length ? Math.min(...times) : null;
};

/** Fastest qualifying lap of the field per round (any phase). */
export function fieldBestByRound(season: SeasonModel): Map<number, number> {
  const best = new Map<number, number>();
  for (const results of season.results.values()) {
    for (const r of results) {
      const time = bestQualifyingTime(r);
      if (time === null) continue;
      const current = best.get(r.round);
      if (current === undefined || time < current) best.set(r.round, time);
    }
  }
  return best;
}

/**
 * Gap to the fastest qualifying lap of the round, in % of that lap.
 * Uses each driver's best lap of any phase, so later phases (better track) can flatter Q3 runners slightly.
 */
export function qualifyingGapPercent(
  result: DriverRoundResult,
  fieldBest: Map<number, number>,
): number | null {
  const time = bestQualifyingTime(result);
  const best = fieldBest.get(result.round);
  if (time === null || best === undefined) return null;
  return ((time - best) / best) * 100;
}
