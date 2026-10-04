import { Link } from 'react-router';
import type { Session } from '../../api/openf1/types';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import table from '../../components/ui/Table.module.css';
import { formatDate, formatLapTime } from '../../lib/format';

export interface CircuitMeetingRow {
  meetingKey: number;
  year: number;
  date: string;
  race: Session | null;
  fastestQualifyingLap: number | null;
  raceLaps: number | null;
  loading: boolean;
}

export function CircuitHistoryTable({ rows, loading, error }: { rows: CircuitMeetingRow[]; loading: boolean; error: unknown }) {
  return (
    <Card title="Rounds held here (OpenF1)" flush>
      {error ? (
        <ErrorState error={error} />
      ) : loading ? (
        <Skeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState title="No finished rounds at this circuit in OpenF1" />
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Season</th>
                <th className={table.optionalNarrow}>Date</th>
                <th className={table.right}>Fastest quali lap</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>Race laps</th>
                <th className={table.right}>Open</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((row) => (
                <tr key={row.meetingKey}>
                  <td className={table.primary}>{row.year}</td>
                  <td className={table.optionalNarrow}>{row.date ? formatDate(row.date) : '—'}</td>
                  <td className={`${table.right} ${table.time}`}>{row.loading ? '…' : formatLapTime(row.fastestQualifyingLap)}</td>
                  <td className={`${table.right} ${table.optionalNarrow}`}>{row.loading ? '…' : (row.raceLaps ?? '—')}</td>
                  <td className={table.right}>
                    <Link className={table.link} to={`/rounds/${row.meetingKey}`}>
                      Round
                    </Link>
                    {row.race && (
                      <>
                        {' · '}
                        <Link className={table.link} to={`/replay/${row.race.session_key}`}>
                          Replay
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
