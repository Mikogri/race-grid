// Per-round series for the Trends screen. Observations only — causes are never inferred.
import {
  MIN_PACE_LAPS,
  teamPerformance,
  teamQualifyingGaps,
  teamRacePaceGaps,
  twoCarByRound,
  type PaceInput,
} from "./performance";
import { fieldBestByRound, qualifyingGapPercent } from "./qualifying";
import type { SeasonModel } from "./season";
import { UNKNOWN_TEAM_COLOR } from "../lib/teams";

/** Structurally compatible with the chart component's series. */
export interface TrendSeries {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
  points: { x: number; y: number }[];
}

export interface Entity {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
}

/** Teams in championship order. */
export function teamEntities(season: SeasonModel): Entity[] {
  const order = season.teamStandings.map((t) => t.teamName);
  return [...season.teams.values()]
    .sort(
      (a, b) =>
        (order.indexOf(a.name) + 1 || 99) - (order.indexOf(b.name) + 1 || 99),
    )
    .map((t) => ({ id: t.name, label: t.name, color: t.color }));
}

/** Drivers in championship order; the second driver of a team is dashed so teammates stay apart. */
export function driverEntities(
  season: SeasonModel,
  driverNumbers: number[],
): Entity[] {
  const seenTeams = new Set<string>();
  return driverNumbers.map((n) => {
    const d = season.drivers.get(n);
    const dashed = d ? seenTeams.has(d.teamName) : false;
    if (d) seenTeams.add(d.teamName);
    return {
      id: String(n),
      label: d?.acronym ?? `#${n}`,
      color: d?.color ?? UNKNOWN_TEAM_COLOR,
      dashed,
    };
  });
}

const series = (
  entity: Entity,
  points: { x: number; y: number }[],
): TrendSeries => ({
  id: entity.id,
  label: entity.label,
  color: entity.color,
  dashed: entity.dashed,
  points,
});

/** Championship points after each Grand Prix (sprint points included in the running total). */
export function pointsProgression(
  season: SeasonModel,
  entities: Entity[],
  kind: "drivers" | "teams",
): TrendSeries[] {
  const races = season.standingsHistory.filter(
    (h) => h.session.session_name === "Race" && h.round !== null,
  );
  return entities.map((e) =>
    series(
      e,
      races.map((h) => ({
        x: h.round ?? 0,
        y:
          (kind === "drivers"
            ? h.drivers.find((d) => String(d.driver_number) === e.id)
                ?.points_current
            : h.teams.find((t) => t.team_name === e.id)?.points_current) ?? 0,
      })),
    ),
  );
}

export function teamQualifyingTrend(
  season: SeasonModel,
  entities: Entity[],
): TrendSeries[] {
  return entities.map((e) =>
    series(
      e,
      teamQualifyingGaps(season, e.id).map((g) => ({ x: g.round, y: g.gap })),
    ),
  );
}

export function teamRacePaceTrend(
  season: SeasonModel,
  entities: Entity[],
  pace: PaceInput,
): TrendSeries[] {
  return entities.map((e) =>
    series(
      e,
      teamRacePaceGaps(season, e.id, pace).map((g) => ({
        x: g.round,
        y: g.gap,
      })),
    ),
  );
}

export function twoCarTrend(
  season: SeasonModel,
  entities: Entity[],
): TrendSeries[] {
  return entities.map((e) =>
    series(
      e,
      twoCarByRound(season, e.id).map((g) => ({ x: g.round, y: g.score })),
    ),
  );
}

/** Performance Index computed over all rounds up to and including each round (cumulative). */
export function indexTrend(
  season: SeasonModel,
  entities: Entity[],
  pace: PaceInput | null,
): TrendSeries[] {
  const rounds = season.completedRounds.map((r) => r.round ?? 0);
  const byRound = rounds.map((round) => {
    const upTo = new Set(rounds.filter((r) => r <= round));
    return { round, teams: teamPerformance(season, pace, upTo) };
  });
  return entities.map((e) =>
    series(
      e,
      byRound
        .map(({ round, teams }) => ({
          x: round,
          y: teams.find((t) => t.teamName === e.id)?.index ?? null,
        }))
        .filter((p): p is { x: number; y: number } => p.y !== null),
    ),
  );
}

export function driverQualifyingTrend(
  season: SeasonModel,
  entities: Entity[],
): TrendSeries[] {
  const fieldBest = fieldBestByRound(season);
  return entities.map((e) =>
    series(
      e,
      (season.results.get(Number(e.id)) ?? [])
        .map((r) => ({ x: r.round, y: qualifyingGapPercent(r, fieldBest) }))
        .filter((p): p is { x: number; y: number } => p.y !== null),
    ),
  );
}

/** Driver median clean lap vs the fastest driver median of the round, in %. */
export function driverRacePaceTrend(
  entities: Entity[],
  pace: PaceInput,
): TrendSeries[] {
  return entities.map((e) =>
    series(
      e,
      [...pace.entries()]
        .map(([round, drivers]) => {
          const ownPace = drivers.get(Number(e.id));
          const own =
            ownPace && ownPace.laps >= MIN_PACE_LAPS
              ? ownPace.median
              : undefined;
          const best = Math.min(
            ...[...drivers.values()]
              .filter((d) => d.laps >= MIN_PACE_LAPS)
              .map((d) => d.median),
          );
          return own !== undefined && Number.isFinite(best)
            ? { x: round, y: ((own - best) / best) * 100 }
            : null;
        })
        .filter((p): p is { x: number; y: number } => p !== null)
        .sort((a, b) => a.x - b.x),
    ),
  );
}

export function finishTrend(
  season: SeasonModel,
  entities: Entity[],
): TrendSeries[] {
  return entities.map((e) =>
    series(
      e,
      (season.results.get(Number(e.id)) ?? [])
        .filter((r) => r.finish !== null)
        .map((r) => ({ x: r.round, y: r.finish ?? 0 })),
    ),
  );
}
