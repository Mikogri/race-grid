// Strategy analytics derived from OpenF1 laps, stints, pit and position data. All values are RaceGrid estimates.
import type { Lap, PitStop, PositionRecord, Stint } from '../api/openf1/types';
import { lastIndexAtOrBefore, median, toMs } from '../lib/stats';
import { cleanLaps } from './laps';

export interface StintPace {
  driverNumber: number;
  stintNumber: number;
  compound: Stint['compound'];
  lapStart: number;
  lapEnd: number;
  cleanLaps: number;
  medianLap: number | null;
  /**
   * Least-squares slope of clean lap time vs tyre age (s/lap). Fuel burn makes cars faster lap by lap,
   * so this is the observed trend, not pure tyre degradation.
   */
  trendPerLap: number | null;
}

function slope(points: { x: number; y: number }[]): number | null {
  if (points.length < 5) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const num = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return den === 0 ? null : num / den;
}

export function stintPace(laps: Lap[], stints: Stint[], pits: PitStop[]): StintPace[] {
  const clean = cleanLaps(laps, pits);
  return stints
    .filter((s) => s.lap_start != null && s.lap_end != null)
    .map((stint) => {
      const lapStart = stint.lap_start ?? 0;
      const lapEnd = stint.lap_end ?? 0;
      const inStint = clean.filter((l) => l.driver_number === stint.driver_number && l.lap_number >= lapStart && l.lap_number <= lapEnd);
      const ageAtStart = stint.tyre_age_at_start ?? 0;
      return {
        driverNumber: stint.driver_number,
        stintNumber: stint.stint_number,
        compound: stint.compound,
        lapStart,
        lapEnd,
        cleanLaps: inStint.length,
        medianLap: median(inStint.map((l) => l.lap_duration ?? 0)),
        trendPerLap: slope(inStint.map((l) => ({ x: ageAtStart + l.lap_number - lapStart, y: l.lap_duration ?? 0 }))),
      };
    });
}

export interface PitLoss {
  pit: PitStop;
  /** (in-lap + out-lap) − 2 × driver's median clean lap. */
  lossSeconds: number | null;
  positionBefore: number | null;
  positionAfter: number | null;
}

type PositionIndex = Map<number, PositionRecord[]>;

export function indexPositions(positions: PositionRecord[]): PositionIndex {
  const index: PositionIndex = new Map();
  for (const p of positions) {
    const list = index.get(p.driver_number) ?? [];
    list.push(p);
    index.set(p.driver_number, list);
  }
  for (const list of index.values()) list.sort((a, b) => toMs(a.date) - toMs(b.date));
  return index;
}

export function positionAt(index: PositionIndex, driverNumber: number, ms: number): number | null {
  const list = index.get(driverNumber);
  if (!list) return null;
  const i = lastIndexAtOrBefore(list, ms, (p) => toMs(p.date));
  return i >= 0 ? list[i].position : null;
}

function lapStartMs(laps: Lap[], driverNumber: number, lapNumber: number): number | null {
  const lap = laps.find((l) => l.driver_number === driverNumber && l.lap_number === lapNumber);
  return lap?.date_start ? toMs(lap.date_start) : null;
}

export function pitLosses(laps: Lap[], pits: PitStop[], positions: PositionIndex): PitLoss[] {
  const clean = cleanLaps(laps, pits);
  const medianByDriver = new Map<number, number>();
  for (const driver of new Set(clean.map((l) => l.driver_number))) {
    const m = median(clean.filter((l) => l.driver_number === driver).map((l) => l.lap_duration ?? 0));
    if (m !== null) medianByDriver.set(driver, m);
  }
  return pits.map((pit) => {
    const inLap = laps.find((l) => l.driver_number === pit.driver_number && l.lap_number === pit.lap_number)?.lap_duration;
    const outLap = laps.find((l) => l.driver_number === pit.driver_number && l.lap_number === pit.lap_number + 1)?.lap_duration;
    const reference = medianByDriver.get(pit.driver_number);
    const before = lapStartMs(laps, pit.driver_number, pit.lap_number);
    const after = lapStartMs(laps, pit.driver_number, pit.lap_number + 2);
    return {
      pit,
      lossSeconds: inLap && outLap && reference ? inLap + outLap - 2 * reference : null,
      positionBefore: before !== null ? positionAt(positions, pit.driver_number, before) : null,
      positionAfter: after !== null ? positionAt(positions, pit.driver_number, after) : null,
    };
  });
}

export interface PitBattle {
  /** The car that stopped first. */
  early: number;
  late: number;
  earlyLap: number;
  lateLap: number;
  earlyAheadBefore: boolean;
  earlyAheadAfter: boolean;
  /** undercut: early stopper jumped the rival; overcut: late stopper jumped; held: order unchanged. */
  outcome: 'undercut' | 'overcut' | 'held';
}

const MAX_LAP_SPLIT = 5;

/**
 * Pit battles between cars running directly next to each other when the first of them stopped,
 * with the second stopping within a few laps. Order compared before the first in-lap and after
 * both out-laps (OpenF1 position data).
 */
export function pitBattles(laps: Lap[], pits: PitStop[], positions: PositionIndex): PitBattle[] {
  const battles: PitBattle[] = [];
  const sorted = [...pits].sort((a, b) => toMs(a.date) - toMs(b.date));
  for (const first of sorted) {
    const before = lapStartMs(laps, first.driver_number, first.lap_number);
    if (before === null) continue;
    const posFirst = positionAt(positions, first.driver_number, before);
    if (posFirst === null) continue;
    const second = sorted.find(
      (p) =>
        p.driver_number !== first.driver_number &&
        p.lap_number > first.lap_number &&
        p.lap_number - first.lap_number <= MAX_LAP_SPLIT &&
        Math.abs((positionAt(positions, p.driver_number, before) ?? 99) - posFirst) === 1,
    );
    if (!second) continue;
    const after = lapStartMs(laps, second.driver_number, second.lap_number + 2);
    if (after === null) continue;
    const posSecondBefore = positionAt(positions, second.driver_number, before) ?? 99;
    const posFirstAfter = positionAt(positions, first.driver_number, after);
    const posSecondAfter = positionAt(positions, second.driver_number, after);
    if (posFirstAfter === null || posSecondAfter === null) continue;
    const earlyAheadBefore = posFirst < posSecondBefore;
    const earlyAheadAfter = posFirstAfter < posSecondAfter;
    battles.push({
      early: first.driver_number,
      late: second.driver_number,
      earlyLap: first.lap_number,
      lateLap: second.lap_number,
      earlyAheadBefore,
      earlyAheadAfter,
      outcome: earlyAheadBefore === earlyAheadAfter ? 'held' : earlyAheadAfter ? 'undercut' : 'overcut',
    });
  }
  return battles;
}
