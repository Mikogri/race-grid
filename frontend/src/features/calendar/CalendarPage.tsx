import { useMemo, useState } from 'react';
import { buildRounds, type RoundInfo } from '../../analytics/season';
import { useSelectedSeason } from '../../app/seasons';
import { CircuitCard } from '../../components/CircuitCard';
import cardStyles from '../../components/CircuitCard.module.css';
import { RoundStatusBadge } from '../../components/RoundStatusBadge';
import { Panel } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { Tabs } from '../../components/ui/Tabs';
import { useCircuitsByKey } from '../../data/circuits';
import { useSeasonMeetings, useSeasonSessions } from '../../data/season';
import { formatCountdown, formatDateRange } from '../../lib/format';
import { CalendarHeader } from './CalendarHeader';

type Filter = 'all' | 'completed' | 'upcoming';


const matches = (round: RoundInfo, filter: Filter) =>
  filter === 'all' || (filter === 'completed' ? round.status === 'completed' : round.status === 'upcoming' || round.status === 'in-progress');

export function CalendarPage() {
  const { year } = useSelectedSeason();
  const meetings = useSeasonMeetings(year);
  const sessions = useSeasonSessions(year);
  const circuits = useCircuitsByKey();
  const [filter, setFilter] = useState<Filter>('all');

  const rounds = useMemo(
    () => (meetings.data && sessions.data ? buildRounds(meetings.data, sessions.data, new Set()) : []),
    [meetings.data, sessions.data],
  );
  const visible = rounds.filter((r) => matches(r, filter));
  const error = meetings.error ?? sessions.error;

  return (
    <>
      <CalendarHeader year={year} rounds={meetings.data && sessions.data ? rounds : null} />
      <Panel
        toolbar={
        <Tabs
          label="Filter rounds"
          value={filter}
          onChange={setFilter}
          items={[
            { id: 'all', label: 'All events' },
            { id: 'completed', label: 'Completed' },
            { id: 'upcoming', label: 'Upcoming' },
          ]}
        />
        }
      >
      {error ? (
        <ErrorState error={error} onRetry={() => void Promise.all([meetings.refetch(), sessions.refetch()])} />
      ) : meetings.isPending || sessions.isPending ? (
        <PageSkeleton layout="cards" />
      ) : visible.length === 0 ? (
        <EmptyState title="No events for this filter" />
      ) : (
        <div className={`${cardStyles.grid} rg-stagger`}>
          {visible.map((round) => {
            const circuit = circuits.byKey.get(round.meeting.circuit_key);
            return (
              <CircuitCard
                key={round.meeting.meeting_key}
                to={`/rounds/${round.meeting.meeting_key}`}
                outline={circuit?.outline ?? null}
                flag={round.meeting.country_flag}
                eyebrow={round.round !== null ? `Round ${round.round}` : round.isTesting ? 'Testing' : 'Event'}
                badge={<RoundStatusBadge status={round.status} />}
                title={round.meeting.meeting_name}
                subtitle={`${round.meeting.circuit_short_name} · ${round.meeting.location}, ${round.meeting.country_name}`}
                facts={[
                  { label: 'Dates', value: formatDateRange(round.meeting.date_start, round.meeting.date_end) },
                  { label: 'Format', value: round.isTesting ? 'Testing' : round.sprint ? 'Sprint' : 'Standard' },
                  { label: round.status === 'upcoming' ? 'Starts' : 'Sessions', value: round.status === 'upcoming' ? formatCountdown(round.meeting.date_start) : round.sessions.length },
                ]}
                muted={round.status === 'cancelled'}
              />
            );
          })}
        </div>
      )}
      </Panel>
    </>
  );
}
