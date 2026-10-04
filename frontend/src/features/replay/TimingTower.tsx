import { timingAt, type ReplayModel } from '../../analytics/replay/model';
import { Badge } from '../../components/ui/Badge';
import table from '../../components/ui/Table.module.css';
import { TeamMarker } from '../../components/ui/TeamMarker';
import { TyreBadge } from '../../components/ui/TyreBadge';
import { useFlip } from '../../components/ui/useFlip';
import { formatLapTime } from '../../lib/format';
import { useClock, type ReplayClock } from './clock';
import styles from './ReplayPage.module.css';

/** Within one second the car behind has DRS: green chip; otherwise yellow. */
const DRS_WINDOW_S = 1;

function Interval({ value, leader }: { value: number | string | null; leader: boolean }) {
  if (leader) return <>Leader</>;
  if (value == null) return <>—</>;
  const close = typeof value === 'number' && value < DRS_WINDOW_S;
  return <span className={close ? styles.gapClose : styles.gapFar}>{typeof value === 'number' ? `+${value.toFixed(3)}` : value}</span>;
}

export function TimingTower({
  clock,
  model,
  selectedDriver,
  onSelectDriver,
}: {
  clock: ReplayClock;
  model: ReplayModel;
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number) => void;
}) {
  const { time } = useClock(clock, 4);
  const rows = timingAt(model, time);
  const bodyRef = useFlip<HTMLTableSectionElement>(rows.map((r) => r.driver.driverNumber).join(','));

  return (
    <div className={styles.tower}>
      <table className={`${table.table} ${table.dense} ${table.live}`}>
        <thead>
          <tr>
            <th>#</th>
            <th>Driver</th>
            <th>Interval</th>
            <th>Last lap</th>
            <th className={table.center}>Tyre</th>
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {rows.map((row) => {
            const n = row.driver.driverNumber;
            return (
              <tr
                key={n}
                data-flip-key={n}
                className={`${table.clickable} ${n === selectedDriver ? table.selected : ''} ${row.retired ? styles.retiredRow : ''}`}
                onClick={() => onSelectDriver(n)}
                aria-selected={n === selectedDriver}
              >
                <td>{row.retired ? '-' : (row.position ?? '—')}</td>
                <td>
                  <span className={styles.towerDriver}>
                    <TeamMarker color={row.driver.color} size="xs" />
                    <span className={styles.towerAcronym}>{row.driver.acronym}</span>
                    {row.inPit && <Badge tone="info">Pit</Badge>}
                  </span>
                </td>
                <td className={table.time}>{row.retired ? <Badge>Out</Badge> : <Interval value={row.interval} leader={row.position === 1} />}</td>
                <td className={`${table.time} ${row.lastLapFastest ? styles.fastest : ''}`}>{row.retired ? '' : formatLapTime(row.lastLap)}</td>
                <td className={table.center}>{row.stint ? <TyreBadge compound={row.stint.compound} age={row.tyreAge} showAge={false} /> : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
