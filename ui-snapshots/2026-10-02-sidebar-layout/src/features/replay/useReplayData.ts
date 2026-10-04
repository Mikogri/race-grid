import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { HOUR } from '../../api/openf1/client';
import { fetchOpenF1 } from '../../api/openf1/endpoints';
import type { LocationRecord, Session } from '../../api/openf1/types';
import { buildReplayModel, type ReplayModel } from '../../analytics/replay/model';
import { buildCarSamples, fitTransform, trailPath, type CarSample, type SvgTransform } from '../../analytics/replay/carPositions';
import type { TrackPath } from '../../analytics/replay/trackPath';
import { sessionQuery, useSessionData } from '../../data/sessionData';

export function useReplaySession(sessionKey: number) {
  return useQuery({
    queryKey: ['openf1', 'sessions', { sessionKey }],
    queryFn: ({ signal }) => fetchOpenF1('sessions', { session_key: sessionKey }, { signal, ttlMs: HOUR }),
    select: (rows) => rows[0] ?? null,
  });
}

/** Everything the replay needs before it can start (~11 requests, persisted after the first load). */
export function useReplayModel(session: Session | null | undefined) {
  const queries = {
    drivers: useSessionData('drivers', session),
    laps: useSessionData('laps', session),
    positions: useSessionData('position', session),
    intervals: useSessionData('intervals', session),
    stints: useSessionData('stints', session),
    pits: useSessionData('pit', session),
    overtakes: useSessionData('overtakes', session),
    raceControl: useSessionData('race_control', session),
    weather: useSessionData('weather', session),
    radio: useSessionData('team_radio', session),
    results: useSessionData('session_result', session),
  };
  const list = Object.values(queries);
  const loaded = list.filter((q) => q.data).length;
  const error = list.find((q) => q.error)?.error ?? null;
  const d = queries;
  const ready = loaded === list.length;

  const model = useMemo<ReplayModel | null>(() => {
    if (!session || !ready) return null;
    return buildReplayModel({
      session,
      drivers: d.drivers.data ?? [],
      laps: d.laps.data ?? [],
      positions: d.positions.data ?? [],
      intervals: d.intervals.data ?? [],
      stints: d.stints.data ?? [],
      pits: d.pits.data ?? [],
      overtakes: d.overtakes.data ?? [],
      raceControl: d.raceControl.data ?? [],
      weather: d.weather.data ?? [],
      radio: d.radio.data ?? [],
      results: d.results.data ?? [],
    });
    // Each query's data reference is stable until it changes.
  }, [session, ready, d.drivers.data, d.laps.data, d.positions.data, d.intervals.data, d.stints.data, d.pits.data, d.overtakes.data, d.raceControl.data, d.weather.data, d.radio.data, d.results.data]);

  return { model, progress: { done: loaded, total: list.length }, error, retry: () => list.filter((q) => q.error).forEach((q) => void q.refetch()) };
}

export const CHUNK_MS = 120_000;
/** Chunks start a little before lights out so cars sit on the grid at t = 0. */
const LEAD_IN_MS = 30_000;

export function chunkIndexAt(startMs: number, ms: number) {
  return Math.max(0, Math.floor((ms - (startMs - LEAD_IN_MS)) / CHUNK_MS));
}

export function chunkWindow(startMs: number, index: number) {
  const from = startMs - LEAD_IN_MS + index * CHUNK_MS;
  return { from, to: from + CHUNK_MS };
}

const windowParams = (startMs: number, index: number) => {
  const { from, to } = chunkWindow(startMs, index);
  return { 'date>=': new Date(from).toISOString(), 'date<': new Date(to).toISOString() };
};

// Snapping is the expensive part; cache it per downloaded chunk (same array instance = same chunk).
const sampleCache = new WeakMap<LocationRecord[], Map<number, CarSample[]>>();

function samplesFor(records: LocationRecord[], transform: SvgTransform, path: TrackPath | null) {
  let cached = sampleCache.get(records);
  if (!cached) {
    cached = buildCarSamples(records, transform, path);
    sampleCache.set(records, cached);
  }
  return cached;
}

export interface LocationChunks {
  /** Samples per driver for the chunks needed around the playhead, in time order. */
  samples: Map<number, CarSample[]>;
  currentLoaded: boolean;
  error: unknown;
  raw: LocationRecord[] | null;
}

/**
 * Location for all cars is ~1.3 MB per 2 minutes, so it is loaded in windows around the playhead:
 * the current chunk plus the next one (prefetch). Chunks are persisted but dropped from memory quickly.
 */
export function useLocationChunks(model: ReplayModel, time: number, transform: SvgTransform | null, path: TrackPath | null): LocationChunks {
  const current = chunkIndexAt(model.startMs, time);
  const lastChunk = chunkIndexAt(model.startMs, model.endMs);
  const indices = [current, current + 1].filter((i) => i <= lastChunk);
  const results = useQueries({
    queries: indices.map((index) => ({ ...sessionQuery('location', model.session, windowParams(model.startMs, index)), gcTime: 90_000 })),
  });

  const currentData = results[0]?.data ?? null;
  const nextData = results[1]?.data ?? null;
  const samples = useMemo(() => {
    const merged = new Map<number, CarSample[]>();
    if (!transform) return merged;
    for (const data of [currentData, nextData]) {
      if (!data) continue;
      for (const [driver, list] of samplesFor(data, transform, path)) {
        merged.set(driver, [...(merged.get(driver) ?? []), ...list]);
      }
    }
    return merged;
  }, [currentData, nextData, transform, path]);

  return { samples, currentLoaded: Boolean(currentData), error: results.find((r) => r.error)?.error ?? null, raw: currentData };
}

/** Telemetry of one driver in the same chunk windows (small: ~60 KB per chunk). */
export function useTelemetryChunks(model: ReplayModel, driverNumber: number | null, fromMs: number, toMs: number) {
  const first = chunkIndexAt(model.startMs, fromMs);
  const last = chunkIndexAt(model.startMs, toMs);
  const indices = driverNumber === null ? [] : Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const results = useQueries({
    queries: indices.map((index) => ({
      ...sessionQuery('car_data', model.session, { driver_number: driverNumber ?? 0, ...windowParams(model.startMs, index) }),
      gcTime: 5 * 60_000,
    })),
  });
  const data = results.flatMap((r) => r.data ?? []);
  return { data, loading: results.some((r) => r.isPending), error: results.find((r) => r.error)?.error ?? null };
}

/**
 * No local outline for this circuit/year: reconstruct one from the leader's second lap
 * (one small request) and fit OpenF1 coordinates into the viewBox from that lap.
 */
export function useReconstructedTrack(model: ReplayModel, enabled: boolean) {
  const from = model.leaderLapStarts[1];
  const to = model.leaderLapStarts[2];
  const leader = [...model.lapsByDriver.values()].flat().find((l) => l.lap_number === 2 && l.date_start && new Date(l.date_start).getTime() === from)?.driver_number;
  const query = useQuery({
    ...sessionQuery('location', model.session, {
      driver_number: leader ?? 0,
      'date>=': new Date(from ?? 0).toISOString(),
      'date<': new Date(to ?? 0).toISOString(),
    }),
    enabled: enabled && leader !== undefined && from !== undefined && to !== undefined,
  });
  return useMemo(() => {
    if (!query.data?.length || leader === undefined) return null;
    const transform = fitTransform(query.data);
    if (!transform) return null;
    const samples = buildCarSamples(query.data, transform, null).get(leader) ?? [];
    return { transform, outline: trailPath(samples, from ?? 0, to ?? 0) };
  }, [query.data, leader, from, to]);
}
