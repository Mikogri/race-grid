import { IconCalendarDue, IconCircleCheck, IconFlag, IconHourglass } from '@tabler/icons-react';
import type { RoundInfo } from '../../analytics/season';
import { MetricGroup } from '../../components/ui/Metric';
import { PageHeader } from '../../components/ui/PageHeader';
import { formatCountdown, formatDate, formatDateRange } from '../../lib/format';

/** Calendar context: title, then KPI cards (as on Standings) with season counters and the next race. */
export function CalendarHeader({ year, rounds }: { year: number; rounds: RoundInfo[] | null }) {
  const grandPrix = rounds?.filter((r) => r.round !== null) ?? [];
  const completed = grandPrix.filter((r) => r.status === 'completed').length;
  const progress = grandPrix.length ? Math.round((completed / grandPrix.length) * 100) : null;
  const next = rounds?.find((r) => r.status === 'in-progress' || r.status === 'upcoming') ?? null;
  const last = grandPrix[grandPrix.length - 1] ?? null;
  const sprints = grandPrix.filter((r) => r.sprint).length;

  return (
    <PageHeader title={`${year} Calendar`} meta={[{ label: 'Events on the OpenF1 calendar', value: rounds ? rounds.length : '—' }]}>
      <MetricGroup
        items={[
          {
            label: 'Grand Prix rounds',
            icon: <IconFlag stroke={1.5} />,
            value: rounds ? grandPrix.length : '—',
            numeric: true,
            sub: `${sprints} sprint weekends`,
            trend: { value: `${rounds?.length ?? 0} events`, direction: 'flat' },
          },
          {
            label: 'Completed',
            icon: <IconCircleCheck stroke={1.5} />,
            value: rounds ? completed : '—',
            numeric: true,
            sub: `of ${grandPrix.length} rounds`,
            trend: progress !== null ? { value: `${progress}%`, direction: 'up' } : undefined,
          },
          {
            label: 'Remaining',
            icon: <IconHourglass stroke={1.5} />,
            value: rounds ? grandPrix.length - completed : '—',
            numeric: true,
            sub: last ? `Finale: ${last.meeting.location}` : undefined,
            trend: last ? { value: formatDate(last.meeting.date_start), direction: 'flat' } : undefined,
          },
          {
            label: 'Next race',
            icon: <IconCalendarDue stroke={1.5} />,
            value: next ? next.meeting.location : rounds ? 'Season complete' : '—',
            sub: next ? formatDateRange(next.meeting.date_start, next.meeting.date_end) : undefined,
            trend: next ? { value: formatCountdown(next.meeting.date_start), direction: 'flat' } : undefined,
          },
        ]}
      />
    </PageHeader>
  );
}
