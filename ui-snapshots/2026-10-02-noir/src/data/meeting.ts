import { useQuery } from '@tanstack/react-query';
import { HOUR, MINUTE } from '../api/openf1/client';
import { fetchOpenF1 } from '../api/openf1/endpoints';
import { driverLookup } from '../analytics/drivers';
import { toMs } from '../lib/stats';

export function useMeeting(meetingKey: number) {
  const meeting = useQuery({
    queryKey: ['openf1', 'meetings', { meetingKey }],
    queryFn: ({ signal }) => fetchOpenF1('meetings', { meeting_key: meetingKey }, { signal, ttlMs: HOUR }),
    select: (rows) => rows[0] ?? null,
  });
  const sessions = useQuery({
    queryKey: ['openf1', 'sessions', { meetingKey }],
    queryFn: ({ signal }) => fetchOpenF1('sessions', { meeting_key: meetingKey }, { signal, ttlMs: 10 * MINUTE }),
    select: (rows) => [...rows].sort((a, b) => toMs(a.date_start) - toMs(b.date_start)),
  });
  const drivers = useQuery({
    queryKey: ['openf1', 'drivers', { meetingKey }],
    queryFn: ({ signal }) => fetchOpenF1('drivers', { meeting_key: meetingKey }, { signal, ttlMs: 6 * HOUR }),
    select: driverLookup,
  });
  return { meeting, sessions, drivers };
}
