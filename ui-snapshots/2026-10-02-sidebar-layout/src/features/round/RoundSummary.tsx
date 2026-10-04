import { IconArrowsExchange, IconFlag, IconLaurelWreath, IconSparkle2, IconStopwatch, IconTool } from '@tabler/icons-react';
import { labelFor, type DriverLookup } from '../../analytics/drivers';
import { neutralisations } from '../../analytics/raceControl';
import type { Session } from '../../api/openf1/types';
import { MetricGroup, type MetricItem } from '../../components/ui/Metric';
import { useSessionData } from '../../data/sessionData';
import { formatDuration } from '../../lib/format';

/** Headline numbers of the race weekend. */
export function RoundSummary({ race, qualifying, lookup }: { race: Session; qualifying: Session | undefined; lookup: DriverLookup }) {
  const results = useSessionData('session_result', race);
  const qualifyingResults = useSessionData('session_result', qualifying);
  const overtakes = useSessionData('overtakes', race);
  const pits = useSessionData('pit', race);
  const control = useSessionData('race_control', race);

  const winner = results.data?.find((r) => r.position === 1);
  const pole = qualifyingResults.data?.find((r) => r.position === 1);
  const periods = control.data ? neutralisations(control.data) : null;
  const count = (kind: string) => periods?.filter((p) => p.kind === kind).length ?? 0;
  const pending = '…';

  const stats: MetricItem[] = [
    { label: 'Winner', icon: <IconLaurelWreath stroke={1.5} />, value: winner ? labelFor(lookup, winner.driver_number).name : results.isPending ? pending : '—' },
    { label: 'Race time', icon: <IconStopwatch stroke={1.5} />, numeric: true, value: winner && typeof winner.duration === 'number' ? formatDuration(winner.duration) : results.isPending ? pending : '—' },
    { label: 'Pole', icon: <IconSparkle2 stroke={1.5} />, value: pole ? labelFor(lookup, pole.driver_number).name : qualifyingResults.isPending && qualifying ? pending : '—' },
    { label: 'Overtakes', icon: <IconArrowsExchange stroke={1.5} />, numeric: true, value: overtakes.data ? overtakes.data.length : overtakes.isPending ? pending : '—' },
    { label: 'Pit stops', icon: <IconTool stroke={1.5} />, numeric: true, value: pits.data ? pits.data.length : pits.isPending ? pending : '—' },
    { label: 'SC / VSC / Red', icon: <IconFlag stroke={1.5} />, numeric: true, value: periods ? `${count('SC')} / ${count('VSC')} / ${count('RED')}` : control.isPending ? pending : '—' },
  ];

  return <MetricGroup items={stats} compact />;
}
