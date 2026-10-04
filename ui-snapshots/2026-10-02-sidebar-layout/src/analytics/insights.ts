// RaceGrid Insights: short statements computed from the season model. Only observations, never causes.
import { headToHead, summarize } from './driverStats';
import type { SeasonModel } from './season';

export interface Insight {
  id: string;
  text: string;
  /** How it was computed, shown on hover. */
  basis: string;
  to?: string;
}

const pointsOf = (season: SeasonModel, driverNumber: number, fromRound: number) =>
  (season.results.get(driverNumber) ?? []).filter((r) => r.round >= fromRound).reduce((s, r) => s + r.points + r.sprintPoints, 0);

export function seasonInsights(season: SeasonModel): Insight[] {
  const insights: Insight[] = [];
  const name = (n: number) => season.drivers.get(n)?.fullName ?? `#${n}`;
  const lastRound = season.completedRounds[season.completedRounds.length - 1];
  if (!lastRound?.round) return insights;

  // Championship gap.
  const [p1, p2] = season.driverStandings;
  if (p1 && p2) {
    insights.push({
      id: 'gap',
      text: `${name(p1.driverNumber)} leads ${name(p2.driverNumber)} by ${p1.points - p2.points} points after round ${lastRound.round}.`,
      basis: 'OpenF1 championship_drivers after the latest race or sprint.',
      to: '/standings',
    });
  }

  // Form: most points over the last three rounds.
  const fromRound = Math.max(1, lastRound.round - 2);
  const form = [...season.results.keys()]
    .map((n) => ({ n, points: pointsOf(season, n, fromRound) }))
    .sort((a, b) => b.points - a.points)[0];
  if (form && form.points > 0) {
    insights.push({
      id: 'form',
      text: `Best recent form: ${name(form.n)} scored ${form.points} points in rounds ${fromRound}–${lastRound.round}, the most of any driver.`,
      basis: 'Sum of race and sprint points from OpenF1 session_result over the last three rounds.',
      to: `/drivers/${season.year}/${form.n}`,
    });
  }

  // Biggest climb at the latest race.
  const climbs = [...season.results.entries()]
    .map(([n, results]) => ({ n, r: results.find((r) => r.round === lastRound.round) }))
    .filter((x) => x.r && x.r.grid !== null && x.r.finish !== null)
    .map((x) => ({ n: x.n, grid: x.r?.grid ?? 0, finish: x.r?.finish ?? 0 }))
    .sort((a, b) => b.grid - b.finish - (a.grid - a.finish));
  const climb = climbs[0];
  if (climb && climb.grid - climb.finish > 0) {
    insights.push({
      id: 'climb',
      text: `Biggest climb in ${lastRound.meeting.meeting_name}: ${name(climb.n)} from P${climb.grid} to P${climb.finish} (+${climb.grid - climb.finish}).`,
      basis: 'Grid (OpenF1 starting_grid) minus classified finish.',
      to: `/rounds/${lastRound.meeting.meeting_key}?tab=grid`,
    });
  }

  // Points streak.
  const streaks = [...season.results.entries()].map(([n, results]) => {
    let streak = 0;
    for (let i = results.length - 1; i >= 0 && results[i].points > 0; i--) streak++;
    return { n, streak };
  });
  const streak = streaks.sort((a, b) => b.streak - a.streak)[0];
  if (streak && streak.streak >= 3) {
    insights.push({
      id: 'streak',
      text: `${name(streak.n)} has scored in ${streak.streak} consecutive Grands Prix.`,
      basis: 'Consecutive races with points > 0 (sprints not counted).',
      to: `/drivers/${season.year}/${streak.n}`,
    });
  }

  // Most one-sided teammate qualifying battle.
  let mostOneSided: { a: number; b: number; qa: number; qb: number } | null = null;
  for (const team of season.teams.values()) {
    const [a, b] = team.driverNumbers;
    if (a === undefined || b === undefined) continue;
    const h2h = headToHead(season.results.get(a) ?? [], season.results.get(b) ?? []);
    const margin = Math.abs(h2h.qualifyingA - h2h.qualifyingB);
    if (h2h.rounds >= 4 && (!mostOneSided || margin > Math.abs(mostOneSided.qa - mostOneSided.qb))) {
      mostOneSided = { a, b, qa: h2h.qualifyingA, qb: h2h.qualifyingB };
    }
  }
  if (mostOneSided) {
    const leader = mostOneSided.qa >= mostOneSided.qb ? mostOneSided.a : mostOneSided.b;
    const other = leader === mostOneSided.a ? mostOneSided.b : mostOneSided.a;
    insights.push({
      id: 'h2h',
      text: `Most one-sided teammate qualifying duel: ${name(leader)} leads ${name(other)} ${Math.max(mostOneSided.qa, mostOneSided.qb)}–${Math.min(mostOneSided.qa, mostOneSided.qb)}.`,
      basis: 'Qualifying classification head-to-head in rounds both drivers entered.',
      to: `/compare?a=${season.year}-${leader}&b=${season.year}-${other}`,
    });
  }

  // Reliability outlier.
  const dnfs = [...season.results.entries()].map(([n, results]) => ({ n, dnf: summarize(results).dnf })).sort((a, b) => b.dnf - a.dnf)[0];
  if (dnfs && dnfs.dnf >= 3) {
    insights.push({
      id: 'dnf',
      text: `${name(dnfs.n)} has the most retirements this season (${dnfs.dnf} DNFs).`,
      basis: 'OpenF1 session_result dnf flag; the cause of a retirement is not published.',
    });
  }
  return insights;
}

export interface FormRow {
  driverNumber: number;
  recentPoints: number;
  positionChange: number | null;
}

/** Championship movement over the last `window` rounds. */
export function formTable(season: SeasonModel, window = 3): FormRow[] {
  const races = season.standingsHistory.filter((h) => h.session.session_name === 'Race');
  const current = races[races.length - 1];
  const before = races[races.length - 1 - window];
  const lastRound = season.completedRounds[season.completedRounds.length - 1]?.round ?? 0;
  return season.driverStandings.map((s) => {
    const start = before?.drivers.find((d) => d.driver_number === s.driverNumber)?.position_current ?? null;
    const now = current?.drivers.find((d) => d.driver_number === s.driverNumber)?.position_current ?? null;
    return {
      driverNumber: s.driverNumber,
      recentPoints: pointsOf(season, s.driverNumber, Math.max(1, lastRound - window + 1)),
      positionChange: start !== null && now !== null ? start - now : null,
    };
  });
}
