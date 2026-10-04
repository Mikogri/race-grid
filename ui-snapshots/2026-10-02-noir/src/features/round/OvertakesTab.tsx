import { labelFor, type DriverLookup } from '../../analytics/drivers';
import type { Overtake, Session } from '../../api/openf1/types';
import layout from '../../components/layout/PageLayout.module.css';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { usePagination } from '../../components/ui/usePagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import table from '../../components/ui/Table.module.css';
import { DriverTag } from '../../components/ui/TeamMarker';
import { useSessionData } from '../../data/sessionData';
import { formatClock } from '../../lib/format';
import { toMs } from '../../lib/stats';

export function OvertakesTab({ session, lookup }: { session: Session; lookup: DriverLookup }) {
  const overtakes = useSessionData('overtakes', session);
  if (overtakes.error) return <ErrorState error={overtakes.error} onRetry={() => void overtakes.refetch()} />;
  if (overtakes.isPending) return <Skeleton rows={10} />;
  if (!overtakes.data?.length) return <EmptyState title="No overtakes recorded for this session" />;

  const made = new Map<number, number>();
  const lost = new Map<number, number>();
  for (const o of overtakes.data) {
    made.set(o.overtaking_driver_number, (made.get(o.overtaking_driver_number) ?? 0) + 1);
    lost.set(o.overtaken_driver_number, (lost.get(o.overtaken_driver_number) ?? 0) + 1);
  }
  const drivers = [...new Set([...made.keys(), ...lost.keys()])].sort((a, b) => (made.get(b) ?? 0) - (made.get(a) ?? 0));
  const start = toMs(overtakes.data[0].date);

  return (
    <div className={layout.withPanel}>
      <OvertakeList overtakes={overtakes.data} lookup={lookup} start={start} />
      <Card title="By driver" flush>
        <table className={table.table}>
          <thead>
            <tr>
              <th>Driver</th>
              <th className={table.right}>Made</th>
              <th className={table.right}>Lost</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((n) => {
              const d = labelFor(lookup, n);
              return (
                <tr key={n}>
                  <td>
                    <DriverTag acronym={d.acronym} color={d.color} />
                  </td>
                  <td className={`${table.right} ${table.strong}`}>{made.get(n) ?? 0}</td>
                  <td className={table.right}>{lost.get(n) ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={table.caption}>
          OpenF1 overtakes include position changes caused by pit stops and penalties, not only on-track passes.
        </p>
      </Card>
    </div>
  );
}

function OvertakeList({ overtakes, lookup, start }: { overtakes: Overtake[]; lookup: DriverLookup; start: number }) {
  const pages = usePagination(overtakes);
  return (
    <Card title={`All overtakes · ${overtakes.length}`} flush>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead>
            <tr>
              <th className={table.optionalNarrow}>Race time</th>
              <th>Overtaking</th>
              <th>Overtaken</th>
              <th className={table.right}>For position</th>
            </tr>
          </thead>
          <tbody>
            {pages.items.map((o, i) => {
              const a = labelFor(lookup, o.overtaking_driver_number);
              const b = labelFor(lookup, o.overtaken_driver_number);
              return (
                <tr key={`${o.date}-${i}`}>
                  <td className={`${table.muted} ${table.optionalNarrow}`}>+{formatClock((toMs(o.date) - start) / 1000)}</td>
                  <td>
                    <DriverTag acronym={a.acronym} color={a.color} />
                  </td>
                  <td>
                    <DriverTag acronym={b.acronym} color={b.color} />
                  </td>
                  <td className={`${table.right} ${table.strong}`}>P{o.position}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={pages.page} pageCount={pages.pageCount} total={pages.total} pageSize={pages.pageSize} onChange={pages.setPage} />
    </Card>
  );
}
