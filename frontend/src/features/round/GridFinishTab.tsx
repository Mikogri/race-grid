import { labelFor, type DriverLookup } from '../../analytics/drivers';
import type { Session } from '../../api/openf1/types';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import table from '../../components/ui/Table.module.css';
import { DriverTag } from '../../components/ui/TeamMarker';
import { useSessionData } from '../../data/sessionData';
import styles from './GridFinishTab.module.css';

/** The grid of a race comes from its qualifying session (sprint: sprint qualifying). */
function gridSessionFor(race: Session, sessions: Session[]): Session | undefined {
  const names = race.session_name === 'Sprint' ? ['Sprint Qualifying', 'Sprint Shootout'] : ['Qualifying'];
  return sessions.find((s) => names.includes(s.session_name));
}

export function GridFinishTab({ race, sessions, lookup }: { race: Session; sessions: Session[]; lookup: DriverLookup }) {
  const gridSession = gridSessionFor(race, sessions);
  const grid = useSessionData('starting_grid', gridSession);
  const results = useSessionData('session_result', race);
  const error = grid.error ?? results.error;

  if (error) return <ErrorState error={error} />;
  if (results.isPending || (gridSession && grid.isPending)) return <Skeleton rows={12} />;

  const gridByDriver = new Map((grid.data ?? []).map((g) => [g.driver_number, g.position]));
  const rows = (results.data ?? [])
    .map((r) => {
      const start = gridByDriver.get(r.driver_number) ?? null;
      return { driverNumber: r.driver_number, grid: start, finish: r.position, change: start !== null && r.position !== null ? start - r.position : null, dnf: r.dnf || r.dns || r.dsq };
    })
    .sort((a, b) => (a.finish ?? 99) - (b.finish ?? 99));

  if (rows.length === 0) return <EmptyState title="No classification for this session" />;
  const maxChange = Math.max(1, ...rows.map((r) => Math.abs(r.change ?? 0)));

  return (
    <Card title="Grid to finish" info="Grid penalties appear only once they are published. Retired cars have no finishing position." flush>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>Driver</th>
              <th className={table.right}>Grid</th>
              <th className={table.right}>Finish</th>
              <th className={styles.barHead}>Positions gained / lost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const driver = labelFor(lookup, row.driverNumber);
              const change = row.change ?? 0;
              return (
                <tr key={row.driverNumber}>
                  <td>
                    <DriverTag acronym={driver.acronym} color={driver.color} name={driver.name} />
                  </td>
                  <td className={table.right}>{row.grid ?? '—'}</td>
                  <td className={`${table.right} ${table.strong}`}>{row.finish ?? (row.dnf ? 'DNF' : '—')}</td>
                  <td>
                    <div className={styles.bar}>
                      <div className={styles.track}>
                        <div className={styles.axis} />
                        {row.change !== null && change !== 0 && (
                          <div
                            className={change > 0 ? styles.gain : styles.loss}
                            style={{ width: `${(Math.abs(change) / maxChange) * 50}%`, [change > 0 ? 'left' : 'right']: '50%' }}
                          />
                        )}
                      </div>
                      <span className={styles.value}>{row.change === null ? '—' : change > 0 ? `+${change}` : change}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
