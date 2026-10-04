import { CircuitCard } from '../../components/CircuitCard';
import { Badge } from '../../components/ui/Badge';
import cardStyles from '../../components/CircuitCard.module.css';
import { Panel } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { usePagination } from '../../components/ui/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState } from '../../components/ui/StateViews';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { useCircuitIndex } from '../../data/circuits';

/** OpenF1 circuit_type: "Temporary - Street", "Permanent", "Temporary - Road". */
const isStreet = (type: string) => type.toLowerCase().includes('street');

export function TracksPage() {
  const circuits = useCircuitIndex();
  const list = circuits.data ?? [];
  const pages = usePagination(list);
  const withOutline = list.filter((c) => c.outline).length;
  const years = list.flatMap((c) => c.readyYears);
  const coverage = years.length ? `${Math.min(...years)} – ${Math.max(...years)}` : '—';

  return (
    <>
      <PageHeader
        title="Tracks"
        meta={[
          { label: 'Circuits', value: list.length || '—' },
          { label: 'With local outline', value: list.length ? withOutline : '—' },
          { label: 'Outline seasons', value: coverage },
        ]}
      />
      <Panel>
      {circuits.error ? (
        <ErrorState error={circuits.error} onRetry={() => void circuits.refetch()} />
      ) : circuits.isPending ? (
        <PageSkeleton layout="cards" />
      ) : (
        <div className={`${cardStyles.grid} rg-stagger`}>
          {pages.items.map((circuit) => (
            <CircuitCard
              key={circuit.circuitKey}
              to={`/tracks/${circuit.slug}`}
              outline={circuit.outline}
              eyebrow={circuit.meeting ? `${circuit.meeting.countryName} · ${circuit.meeting.countryCode}` : 'Circuit'}
              badge={circuit.meeting ? <Badge tone={isStreet(circuit.meeting.circuitType) ? 'warning' : 'info'}>{isStreet(circuit.meeting.circuitType) ? 'Street' : 'Permanent'}</Badge> : undefined}
              accent={circuit.meeting ? (isStreet(circuit.meeting.circuitType) ? 'var(--tone-amber)' : 'var(--tone-blue)') : undefined}
              title={circuit.name}
              subtitle={circuit.meeting ? circuit.meeting.location : 'Not yet raced in OpenF1 history'}
              facts={[
                { label: 'Country', value: circuit.meeting?.countryCode ?? '—' },
                { label: 'Seasons', value: circuit.readyYears.length || '—' },
                { label: 'Latest', value: circuit.readyYears.length ? Math.max(...circuit.readyYears) : '—' },
              ]}
            />
          ))}
        </div>
      )}
      <Pagination page={pages.page} pageCount={pages.pageCount} total={pages.total} pageSize={pages.pageSize} onChange={pages.setPage} />
      </Panel>
    </>
  );
}
