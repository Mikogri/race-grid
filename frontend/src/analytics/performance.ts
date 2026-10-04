// RaceGrid Team Performance Index — explainable composite of observed team + car + driver performance.
// It does NOT isolate car performance: OpenF1 only shows what the whole package achieved.
import { clamp, mean, median, stdDev } from '../lib/stats';
import { bestQualifyingTime, fieldBestByRound } from './qualifying';
import type { DriverRoundResult, SeasonModel } from './season';

export type ComponentKey = 'qualifying' | 'racePace' | 'results' | 'consistency' | 'twoCar' | 'reliability';

export const WEIGHTS: Record<ComponentKey, number> = {
  qualifying: 0.2,
  racePace: 0.25,
  results: 0.25,
  consistency: 0.1,
  twoCar: 0.1,
  reliability: 0.1,
};

export const COMPONENT_LABEL: Record<ComponentKey, string> = {
  qualifying: 'Qualifying pace',
  racePace: 'Race pace',
  results: 'Results',
  consistency: 'Consistency',
  twoCar: 'Two-car strength',
  reliability: 'Reliability',
};

export const FORMULA: Record<ComponentKey, string> = {
  qualifying: '100 − 25 × median gap (%) of the team’s best qualifying lap to the fastest lap of the round',
  racePace: '100 − 25 × median gap (%) of the team’s best median clean race lap to the fastest team’s',
  results: '100 × team points ÷ points available to one team (P1 + P2 of every race and sprint held)',
  consistency: '100 − 10 × standard deviation of the team’s best finishing position (not classified = 20)',
  twoCar: 'Average position score of the team’s weaker car: (21 − finish) ÷ 20 × 100, not classified = 0',
  reliability: '100 × classified finishes ÷ car starts',
};

export type DependencyLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ComponentScore {
  score: number | null;
  /** Raw input, e.g. median gap in %, shown next to the score. */
  raw: number | null;
  rawLabel: string;
}

export interface TeamPerformance {
  teamName: string;
  color: string;
  slug: string;
  rounds: number;
  components: Record<ComponentKey, ComponentScore>;
  index: number | null;
  /** True when some component (usually race pace) is missing and weights were renormalised. */
  provisional: boolean;
  dependency: { share: number | null; level: DependencyLevel | null; topDriver: number | null };
}

/** Race pace: driver_number -> median clean lap, per round. */
export type PaceInput = Map<number, Map<number, { median: number; laps: number }>>;

const NOT_CLASSIFIED = 20;
/** A reference race pace needs a real stint behind it, not a couple of laps before retiring. */
export const MIN_PACE_LAPS = 5;
const finishOrWorst = (r: DriverRoundResult) => r.finish ?? NOT_CLASSIFIED;
const positionScore = (r: DriverRoundResult | undefined) => (r && r.finish !== null ? ((21 - r.finish) / 20) * 100 : 0);

interface TeamRound {
  round: number;
  results: DriverRoundResult[];
}

function teamRounds(season: SeasonModel, teamName: string, rounds?: Set<number>): TeamRound[] {
  const byRound = new Map<number, DriverRoundResult[]>();
  for (const results of season.results.values()) {
    for (const r of results) {
      if (r.teamName !== teamName || (rounds && !rounds.has(r.round))) continue;
      byRound.set(r.round, [...(byRound.get(r.round) ?? []), r]);
    }
  }
  return [...byRound.entries()].map(([round, results]) => ({ round, results })).sort((a, b) => a.round - b.round);
}

/** Points one team could have scored per round: the top two race + sprint scores actually awarded. */
function availablePoints(season: SeasonModel, rounds: Set<number>): number {
  let total = 0;
  for (const round of rounds) {
    const all = [...season.results.values()].flatMap((rs) => rs.filter((r) => r.round === round));
    const top2 = (values: number[]) => values.sort((a, b) => b - a).slice(0, 2).reduce((s, v) => s + v, 0);
    total += top2(all.map((r) => r.points)) + top2(all.map((r) => r.sprintPoints));
  }
  return total;
}

/** Team gap (%) per round for qualifying: best lap of either car vs the fastest lap of the round. */
export function teamQualifyingGaps(season: SeasonModel, teamName: string, rounds?: Set<number>): { round: number; gap: number }[] {
  const fieldBest = fieldBestByRound(season);
  return teamRounds(season, teamName, rounds)
    .map(({ round, results }) => {
      const times = results.map(bestQualifyingTime).filter((t): t is number => t !== null);
      const best = fieldBest.get(round);
      return times.length && best ? { round, gap: ((Math.min(...times) - best) / best) * 100 } : null;
    })
    .filter((x): x is { round: number; gap: number } => x !== null);
}

/** Team gap (%) per round for race pace: better car's median clean lap vs the fastest team's. */
export function teamRacePaceGaps(season: SeasonModel, teamName: string, pace: PaceInput, rounds?: Set<number>): { round: number; gap: number }[] {
  return teamRounds(season, teamName, rounds)
    .map(({ round, results }) => {
      const roundPace = pace.get(round);
      if (!roundPace) return null;
      const teamBest = results
        .map((r) => roundPace.get(r.driverNumber))
        .filter((p): p is { median: number; laps: number } => p !== undefined && p.laps >= MIN_PACE_LAPS)
        .map((p) => p.median);
      // Fastest team = best median among cars with enough clean laps.
      const allBest = Math.min(...[...roundPace.values()].filter((p) => p.laps >= MIN_PACE_LAPS).map((p) => p.median));
      return teamBest.length && Number.isFinite(allBest) ? { round, gap: ((Math.min(...teamBest) - allBest) / allBest) * 100 } : null;
    })
    .filter((x): x is { round: number; gap: number } => x !== null);
}

/** Weaker car's position score per round (two-car strength trend). */
export function twoCarByRound(season: SeasonModel, teamName: string, rounds?: Set<number>): { round: number; score: number }[] {
  return teamRounds(season, teamName, rounds)
    .filter((tr) => tr.results.length >= 2)
    .map(({ round, results }) => ({ round, score: Math.min(...results.map(positionScore)) }));
}

const paceScore = (gap: number | null) => (gap === null ? null : clamp(100 - 25 * gap, 0, 100));

export function teamPerformance(season: SeasonModel, pace: PaceInput | null, rounds?: Set<number>): TeamPerformance[] {
  const roundSet = rounds ?? new Set(season.completedRounds.map((r) => r.round ?? 0));
  const available = availablePoints(season, roundSet);

  return [...season.teams.values()]
    .map((team): TeamPerformance => {
      const tr = teamRounds(season, team.name, roundSet);
      const all = tr.flatMap((t) => t.results);
      const starts = all.filter((r) => r.status !== 'dns');
      const qualiGap = median(teamQualifyingGaps(season, team.name, roundSet).map((g) => g.gap));
      const paceGap = pace ? median(teamRacePaceGaps(season, team.name, pace, roundSet).map((g) => g.gap)) : null;
      const points = all.reduce((s, r) => s + r.points + r.sprintPoints, 0);
      const bestFinishes = tr.map((t) => Math.min(...t.results.map(finishOrWorst)));
      const sigma = stdDev(bestFinishes);
      const twoCar = mean(twoCarByRound(season, team.name, roundSet).map((x) => x.score));
      const reliability = starts.length ? (starts.filter((r) => r.status === 'finished').length / starts.length) * 100 : null;

      const components: Record<ComponentKey, ComponentScore> = {
        qualifying: { score: paceScore(qualiGap), raw: qualiGap, rawLabel: qualiGap === null ? '—' : `${qualiGap.toFixed(2)}% gap` },
        racePace: { score: paceScore(paceGap), raw: paceGap, rawLabel: paceGap === null ? (pace ? '—' : 'loading') : `${paceGap.toFixed(2)}% gap` },
        results: { score: available ? (points / available) * 100 : null, raw: points, rawLabel: `${points} / ${available} pts` },
        consistency: { score: sigma === null ? null : clamp(100 - 10 * sigma, 0, 100), raw: sigma, rawLabel: sigma === null ? '—' : `σ ${sigma.toFixed(2)} pos` },
        twoCar: { score: twoCar, raw: twoCar, rawLabel: twoCar === null ? '—' : `avg ${twoCar.toFixed(0)}` },
        reliability: { score: reliability, raw: reliability, rawLabel: `${starts.filter((r) => r.status === 'finished').length}/${starts.length} classified` },
      };

      const keys = Object.keys(WEIGHTS) as ComponentKey[];
      const present = keys.filter((k) => components[k].score !== null);
      const weightSum = present.reduce((s, k) => s + WEIGHTS[k], 0);
      const index = weightSum > 0 ? present.reduce((s, k) => s + (components[k].score ?? 0) * WEIGHTS[k], 0) / weightSum : null;

      // Driver dependency: share of the team's points scored by its top scorer.
      const byDriver = new Map<number, number>();
      for (const [driverNumber, results] of season.results) {
        const p = results.filter((r) => r.teamName === team.name && roundSet.has(r.round)).reduce((s, r) => s + r.points + r.sprintPoints, 0);
        if (p > 0) byDriver.set(driverNumber, p);
      }
      const top = [...byDriver.entries()].sort((a, b) => b[1] - a[1])[0];
      const share = top && points > 0 ? (top[1] / points) * 100 : null;
      const level: DependencyLevel | null = share === null ? null : share >= 75 ? 'HIGH' : share >= 60 ? 'MEDIUM' : 'LOW';

      return {
        teamName: team.name,
        color: team.color,
        slug: team.slug,
        rounds: tr.length,
        components,
        index,
        provisional: present.length < keys.length,
        dependency: { share, level, topDriver: top?.[0] ?? null },
      };
    })
    .filter((t) => t.rounds > 0)
    .sort((a, b) => (b.index ?? -1) - (a.index ?? -1));
}
