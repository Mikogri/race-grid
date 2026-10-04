import { useQueries, useQuery } from '@tanstack/react-query';
import { HOUR } from '../api/openf1/client';
import { fetchOpenF1 } from '../api/openf1/endpoints';
import type { Session } from '../api/openf1/types';
import { toMs } from '../lib/stats';
import { sessionQuery } from './sessionData';

function useFinishedCircuitSessions(circuitKey: number | undefined, keep: (session: Session) => boolean) {
  return useQuery({
    queryKey: ['openf1', 'sessions', { circuitKey }],
    queryFn: ({ signal }) => fetchOpenF1('sessions', { circuit_key: circuitKey }, { signal, ttlMs: 6 * HOUR }),
    enabled: circuitKey !== undefined,
    select: (sessions) =>
      sessions.filter((s) => !s.is_cancelled && toMs(s.date_end) < Date.now() && keep(s)).sort((a, b) => toMs(a.date_start) - toMs(b.date_start)),
  });
}

/** All finished Qualifying and Race sessions held at a circuit (every season OpenF1 covers). */
export function useCircuitSessions(circuitKey: number | undefined) {
  return useFinishedCircuitSessions(circuitKey, (s) => s.session_name === 'Race' || s.session_name === 'Qualifying');
}

/** Every finished session at a circuit (practice, qualifying, sprint, race). */
export function useAllCircuitSessions(circuitKey: number | undefined) {
  return useFinishedCircuitSessions(circuitKey, () => true);
}

export function useSessionsLaps(sessions: Session[]) {
  return useQueries({ queries: sessions.map((session) => sessionQuery('laps', session)) });
}

export function useMeetingDriversQueries(meetingKeys: number[]) {
  return useQueries({
    queries: meetingKeys.map((meetingKey) => ({
      queryKey: ['openf1', 'drivers', { meetingKey }],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchOpenF1('drivers', { meeting_key: meetingKey }, { signal, ttlMs: 6 * HOUR }),
      staleTime: Infinity,
    })),
  });
}
