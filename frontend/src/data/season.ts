import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOpenF1, ttlForSeason, type Endpoint } from '../api/openf1/endpoints';
import type { Session } from '../api/openf1/types';
import { buildSeason, type SeasonModel } from '../analytics/season';

export function useSeasonSessions(year: number) {
  return useQuery({
    queryKey: ['openf1', 'sessions', { year }],
    queryFn: ({ signal }) => fetchOpenF1('sessions', { year }, { signal, ttlMs: ttlForSeason(year) }),
    enabled: year > 0,
  });
}

export function useSeasonMeetings(year: number) {
  return useQuery({
    queryKey: ['openf1', 'meetings', { year }],
    queryFn: ({ signal }) => fetchOpenF1('meetings', { year }, { signal, ttlMs: ttlForSeason(year) }),
    enabled: year > 0,
  });
}

/** One request for a whole season: OpenF1 accepts session_key ranges. */
function sessionRange(sessions: Session[] | undefined): { from: number; to: number } | null {
  if (!sessions?.length) return null;
  const keys = sessions.map((s) => s.session_key);
  return { from: Math.min(...keys), to: Math.max(...keys) };
}

function useSeasonRangeQuery<E extends Endpoint>(endpoint: E, year: number, sessions: Session[] | undefined) {
  const range = sessionRange(sessions);
  return useQuery({
    queryKey: ['openf1', endpoint, { year, range }],
    queryFn: ({ signal }) =>
      fetchOpenF1(endpoint, { 'session_key>=': range?.from, 'session_key<=': range?.to }, { signal, ttlMs: ttlForSeason(year) }),
    // Rows of other seasons inside the numeric range are ignored by buildSeason (matched via session keys).
    enabled: range !== null,
  });
}

export interface SeasonQuery {
  season: SeasonModel | undefined;
  isPending: boolean;
  error: unknown;
  refetch: () => void;
}

/** Calendar, results, grids, drivers and championship tables for one season (~7 requests, cached). Pass 0 to skip. */
export function useSeason(year: number): SeasonQuery {
  const sessions = useSeasonSessions(year);
  const meetings = useSeasonMeetings(year);
  const results = useSeasonRangeQuery('session_result', year, sessions.data);
  const grid = useSeasonRangeQuery('starting_grid', year, sessions.data);
  const drivers = useSeasonRangeQuery('drivers', year, sessions.data);
  const championshipDrivers = useSeasonRangeQuery('championship_drivers', year, sessions.data);
  const championshipTeams = useSeasonRangeQuery('championship_teams', year, sessions.data);

  const queries = [sessions, meetings, results, grid, drivers, championshipDrivers, championshipTeams];
  const season = useMemo(() => {
    if (!sessions.data || !meetings.data || !results.data || !grid.data || !drivers.data || !championshipDrivers.data || !championshipTeams.data) {
      return undefined;
    }
    return buildSeason({
      year,
      sessions: sessions.data,
      meetings: meetings.data,
      results: results.data,
      grid: grid.data,
      drivers: drivers.data,
      championshipDrivers: championshipDrivers.data,
      championshipTeams: championshipTeams.data,
    });
  }, [year, sessions.data, meetings.data, results.data, grid.data, drivers.data, championshipDrivers.data, championshipTeams.data]);

  const failed = queries.find((q) => q.error);
  return {
    season,
    isPending: !season && !failed,
    error: failed?.error ?? null,
    refetch: () => queries.filter((q) => q.error).forEach((q) => void q.refetch()),
  };
}
