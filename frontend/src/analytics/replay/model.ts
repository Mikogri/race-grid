// Time-indexed view of one race session for the replay. Built once from raw OpenF1 lists.
import type {
  Driver,
  IntervalRecord,
  Lap,
  Overtake,
  PitStop,
  PositionRecord,
  RaceControlMessage,
  Session,
  SessionResult,
  Stint,
  TeamRadio,
  WeatherRecord,
} from '../../api/openf1/types';
import { lastIndexAtOrBefore, toMs } from '../../lib/stats';
import { driverLookup, labelFor, type DriverLabel, type DriverLookup } from '../drivers';
import { neutralisations, type Neutralisation } from '../raceControl';

export interface ReplayRaw {
  session: Session;
  drivers: Driver[];
  laps: Lap[];
  positions: PositionRecord[];
  intervals: IntervalRecord[];
  stints: Stint[];
  pits: PitStop[];
  overtakes: Overtake[];
  raceControl: RaceControlMessage[];
  weather: WeatherRecord[];
  radio: TeamRadio[];
  results: SessionResult[];
}

export type ReplayEventKind = 'overtake' | 'pit' | 'flag' | 'neutralisation' | 'control' | 'radio';

export interface ReplayEvent {
  id: string;
  ms: number;
  kind: ReplayEventKind;
  title: string;
  detail?: string;
  drivers: number[];
  lap: number | null;
  radioUrl?: string;
}

interface Timed<T> {
  ms: number;
  value: T;
}

export interface ReplayModel {
  session: Session;
  startMs: number;
  endMs: number;
  totalLaps: number;
  lookup: DriverLookup;
  drivers: DriverLabel[];
  lapsByDriver: Map<number, Lap[]>;
  /** Start time of each lap of the race leader (index 0 = lap 1). */
  leaderLapStarts: number[];
  positions: Map<number, Timed<number>[]>;
  intervals: Map<number, Timed<{ gap: number | string | null; interval: number | string | null }>[]>;
  stints: Stint[];
  pits: PitStop[];
  periods: Neutralisation[];
  weather: Timed<WeatherRecord>[];
  events: ReplayEvent[];
  results: Map<number, SessionResult>;
  raw: ReplayRaw;
}

function groupTimed<T, V>(rows: T[], driver: (row: T) => number, date: (row: T) => string, value: (row: T) => V) {
  const map = new Map<number, Timed<V>[]>();
  for (const row of rows) {
    const list = map.get(driver(row)) ?? [];
    list.push({ ms: toMs(date(row)), value: value(row) });
    map.set(driver(row), list);
  }
  for (const list of map.values()) list.sort((a, b) => a.ms - b.ms);
  return map;
}

export function latestAt<V>(list: Timed<V>[] | undefined, ms: number): V | null {
  if (!list) return null;
  const i = lastIndexAtOrBefore(list, ms, (t) => t.ms);
  return i >= 0 ? list[i].value : null;
}

function buildEvents(raw: ReplayRaw, lookup: DriverLookup, lapAtMs: (ms: number) => number): ReplayEvent[] {
  const acr = (n: number) => labelFor(lookup, n).acronym;
  const events: ReplayEvent[] = [];
  raw.overtakes.forEach((o, i) => {
    const ms = toMs(o.date);
    events.push({
      id: `o${i}`,
      ms,
      kind: 'overtake',
      title: `${acr(o.overtaking_driver_number)} passes ${acr(o.overtaken_driver_number)}`,
      detail: `for P${o.position}`,
      drivers: [o.overtaking_driver_number, o.overtaken_driver_number],
      lap: lapAtMs(ms),
    });
  });
  raw.pits.forEach((p, i) => {
    events.push({
      id: `p${i}`,
      ms: toMs(p.date),
      kind: 'pit',
      title: `${acr(p.driver_number)} pits`,
      detail: [p.lane_duration != null ? `lane ${p.lane_duration.toFixed(1)} s` : null, p.stop_duration != null ? `stop ${p.stop_duration.toFixed(1)} s` : null]
        .filter(Boolean)
        .join(' · '),
      drivers: [p.driver_number],
      lap: p.lap_number,
    });
  });
  raw.raceControl.forEach((m, i) => {
    const neutral = m.category === 'SafetyCar' || m.flag === 'RED';
    events.push({
      id: `c${i}`,
      ms: toMs(m.date),
      kind: neutral ? 'neutralisation' : m.category === 'Flag' ? 'flag' : 'control',
      title: m.message,
      drivers: m.driver_number ? [m.driver_number] : [],
      lap: m.lap_number,
    });
  });
  raw.radio.forEach((r, i) => {
    const ms = toMs(r.date);
    events.push({ id: `r${i}`, ms, kind: 'radio', title: `Team radio · ${acr(r.driver_number)}`, drivers: [r.driver_number], lap: lapAtMs(ms), radioUrl: r.recording_url });
  });
  return events.sort((a, b) => a.ms - b.ms);
}

export function buildReplayModel(raw: ReplayRaw): ReplayModel | null {
  const lookup = driverLookup(raw.drivers);
  const lapsByDriver = new Map<number, Lap[]>();
  for (const lap of raw.laps) {
    const list = lapsByDriver.get(lap.driver_number) ?? [];
    list.push(lap);
    lapsByDriver.set(lap.driver_number, list);
  }
  for (const list of lapsByDriver.values()) list.sort((a, b) => a.lap_number - b.lap_number);

  // Lap n of the race starts when the first car starts lap n.
  const firstStart = new Map<number, number>();
  let endMs = 0;
  for (const lap of raw.laps) {
    if (!lap.date_start) continue;
    const ms = toMs(lap.date_start);
    const current = firstStart.get(lap.lap_number);
    if (current === undefined || ms < current) firstStart.set(lap.lap_number, ms);
    if (lap.lap_duration) endMs = Math.max(endMs, ms + lap.lap_duration * 1000);
  }
  const totalLaps = Math.max(0, ...firstStart.keys());
  const leaderLapStarts = Array.from({ length: totalLaps }, (_, i) => firstStart.get(i + 1) ?? NaN).filter((ms) => Number.isFinite(ms));
  const startMs = leaderLapStarts[0];
  if (startMs === undefined || !endMs) return null;
  endMs += 30_000; // show the slow-down after the flag

  const lapAtMs = (ms: number) => Math.max(1, lastIndexAtOrBefore(leaderLapStarts, ms, (v) => v) + 1);
  const drivers = [...lookup.values()].sort((a, b) => a.driverNumber - b.driverNumber);

  return {
    session: raw.session,
    startMs,
    endMs,
    totalLaps,
    lookup,
    drivers,
    lapsByDriver,
    leaderLapStarts,
    positions: groupTimed(raw.positions, (p) => p.driver_number, (p) => p.date, (p) => p.position),
    intervals: groupTimed(raw.intervals, (p) => p.driver_number, (p) => p.date, (p) => ({ gap: p.gap_to_leader, interval: p.interval })),
    stints: raw.stints,
    pits: raw.pits,
    periods: neutralisations(raw.raceControl),
    weather: raw.weather.map((w) => ({ ms: toMs(w.date), value: w })).sort((a, b) => a.ms - b.ms),
    events: buildEvents(raw, lookup, lapAtMs),
    results: new Map(raw.results.map((r) => [r.driver_number, r])),
    raw,
  };
}

/** Race lap shown on the lap counter (leader's lap). */
export function raceLapAt(model: ReplayModel, ms: number): number {
  return Math.min(model.totalLaps, Math.max(1, lastIndexAtOrBefore(model.leaderLapStarts, ms, (v) => v) + 1));
}

export function driverLapAt(model: ReplayModel, driverNumber: number, ms: number): Lap | null {
  const laps = model.lapsByDriver.get(driverNumber);
  if (!laps) return null;
  let current: Lap | null = null;
  for (const lap of laps) {
    if (lap.date_start && toMs(lap.date_start) <= ms) current = lap;
    else if (lap.date_start) break;
  }
  return current;
}

export interface TimingRow {
  driver: DriverLabel;
  position: number | null;
  gap: number | string | null;
  interval: number | string | null;
  lap: number | null;
  /** Duration of the driver's last completed lap (seconds). */
  lastLap: number | null;
  /** The last lap is the fastest lap of the race so far. */
  lastLapFastest: boolean;
  stint: Stint | null;
  tyreAge: number | null;
  inPit: boolean;
  retired: boolean;
}

/** Duration of a lap once it has been completed at `ms`, else null. */
const completedDuration = (lap: Lap, ms: number) =>
  lap.date_start && lap.lap_duration && toMs(lap.date_start) + lap.lap_duration * 1000 <= ms ? lap.lap_duration : null;

/** Fastest S1 / S2 / S3 of all drivers among laps completed at `ms`. */
export function fieldBestSectorsAt(model: ReplayModel, ms: number): (number | null)[] {
  const best: (number | null)[] = [null, null, null];
  for (const laps of model.lapsByDriver.values()) {
    for (const lap of laps) {
      if (completedDuration(lap, ms) === null) continue;
      [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3].forEach((v, i) => {
        if (v && (best[i] === null || v < (best[i] ?? Infinity))) best[i] = v;
      });
    }
  }
  return best;
}

/** F1 sector colours: purple = fastest of the field, green = personal best, yellow = slower; null = no time yet. */
export type SectorStatus = 'fastest' | 'personal' | 'slower' | null;

/** Sector times of the driver's last completed lap at `ms`, with their F1 colour status. */
export function sectorsAt(model: ReplayModel, driverNumber: number, ms: number): { times: (number | null)[]; status: SectorStatus[] } {
  const completed = (model.lapsByDriver.get(driverNumber) ?? []).filter((lap) => completedDuration(lap, ms) !== null);
  const sectorsOf = (lap: Lap) => [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3];
  const last = completed[completed.length - 1];
  const times = last ? sectorsOf(last) : [null, null, null];
  const personal = [0, 1, 2].map((i) =>
    completed.reduce<number | null>((best, lap) => {
      const v = sectorsOf(lap)[i];
      return v && (best === null || v < best) ? v : best;
    }, null),
  );
  const field = fieldBestSectorsAt(model, ms);
  const status = times.map((v, i): SectorStatus => (v === null ? null : v === field[i] ? 'fastest' : v === personal[i] ? 'personal' : 'slower'));
  return { times, status };
}

export function timingAt(model: ReplayModel, ms: number): TimingRow[] {
  let fastest: number | null = null;
  for (const laps of model.lapsByDriver.values()) {
    for (const lap of laps) {
      const duration = completedDuration(lap, ms);
      if (duration !== null && (fastest === null || duration < fastest)) fastest = duration;
    }
  }
  const rows = model.drivers.map((driver): TimingRow => {
    const n = driver.driverNumber;
    const lap = driverLapAt(model, n, ms);
    const lapNumber = lap?.lap_number ?? null;
    const stint =
      lapNumber === null
        ? null
        : (model.stints.find((s) => s.driver_number === n && (s.lap_start ?? 0) <= lapNumber && (s.lap_end ?? Infinity) >= lapNumber) ?? null);
    const timing = latestAt(model.intervals.get(n), ms);
    const laps = model.lapsByDriver.get(n) ?? [];
    const last = laps[laps.length - 1];
    const lastEnd = last?.date_start ? toMs(last.date_start) + (last.lap_duration ?? 0) * 1000 : null;
    const result = model.results.get(n);
    const retired = Boolean(result && (result.dnf || result.dns) && (lastEnd === null || ms > lastEnd + 30_000));
    let lastLap: number | null = null;
    for (let i = laps.length - 1; i >= 0 && lastLap === null; i--) lastLap = completedDuration(laps[i], ms);
    return {
      driver,
      position: latestAt(model.positions.get(n), ms),
      gap: timing?.gap ?? null,
      interval: timing?.interval ?? null,
      lap: lapNumber,
      lastLap,
      lastLapFastest: lastLap !== null && lastLap === fastest,
      stint,
      tyreAge: stint && lapNumber !== null ? (stint.tyre_age_at_start ?? 0) + lapNumber - (stint.lap_start ?? lapNumber) : null,
      inPit: model.pits.some((p) => p.driver_number === n && ms >= toMs(p.date) && ms <= toMs(p.date) + (p.lane_duration ?? 25) * 1000),
      retired,
    };
  });
  return rows.sort((a, b) => Number(a.retired) - Number(b.retired) || (a.position ?? 99) - (b.position ?? 99));
}
