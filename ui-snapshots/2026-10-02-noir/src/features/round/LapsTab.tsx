import { useState } from 'react';
import { labelFor, type DriverLookup } from '../../analytics/drivers';
import { cleanLaps, summarizeLaps } from '../../analytics/laps';
import type { Session } from '../../api/openf1/types';
import { LineChart } from '../../components/charts/LineChart';
import layout from '../../components/layout/PageLayout.module.css';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import table from '../../components/ui/Table.module.css';
import { DriverTag } from '../../components/ui/TeamMarker';
import { useSessionData } from '../../data/sessionData';
import { formatLapTime } from '../../lib/format';
import styles from './LapsTab.module.css';

const MAX_SELECTED = 4;

export function LapsTab({ session, lookup }: { session: Session; lookup: DriverLookup }) {
  const laps = useSessionData('laps', session);
  const pits = useSessionData('pit', session);
  const [picked, setPicked] = useState<number[] | null>(null);

  if (laps.error) return <ErrorState error={laps.error} onRetry={() => void laps.refetch()} />;
  if (laps.isPending) return <Skeleton rows={12} />;
  if (!laps.data?.length) return <EmptyState title="No lap data for this session" />;

  const summaries = summarizeLaps(laps.data).sort((a, b) => (a.bestLap?.lap_duration ?? Infinity) - (b.bestLap?.lap_duration ?? Infinity));
  const overallSector = [0, 1, 2].map((i) => Math.min(...summaries.map((s) => s.bestSectors[i] ?? Infinity)));
  const overallBest = summaries[0]?.bestLap?.lap_duration ?? null;
  const selected = picked ?? summaries.slice(0, 3).map((s) => s.driverNumber);

  const toggle = (driverNumber: number) => {
    const current = selected;
    if (current.includes(driverNumber)) setPicked(current.filter((n) => n !== driverNumber));
    else setPicked([...current, driverNumber].slice(-MAX_SELECTED));
  };

  const clean = cleanLaps(laps.data, pits.data ?? []);
  const series = selected.map((driverNumber) => {
    const driver = labelFor(lookup, driverNumber);
    return {
      id: String(driverNumber),
      label: driver.acronym,
      color: driver.color,
      points: clean
        .filter((l) => l.driver_number === driverNumber)
        .sort((a, b) => a.lap_number - b.lap_number)
        .map((l) => ({ x: l.lap_number, y: l.lap_duration ?? 0 })),
    };
  });

  return (
    <div className={layout.stack}>
      <Card title="Lap times" actions={<span>Click rows to compare up to {MAX_SELECTED} drivers</span>}>
        <LineChart
          label="Clean lap times by lap for selected drivers"
          series={series}
          height={220}
          formatX={(x) => `Lap ${Math.round(x)}`}
          formatY={(y) => formatLapTime(y)}
        />
        <p className={styles.caption}>Clean laps only: no opening lap, pit in/out laps or laps slower than 107% of the driver's median (removes SC/VSC laps).</p>
      </Card>
      <Card title="Best laps & sectors" flush>
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Driver</th>
                <th className={table.right}>Best lap</th>
                <th className={table.right}>Gap</th>
                <th className={`${table.right} ${table.optional}`}>Lap #</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>Best S1</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>Best S2</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>Best S3</th>
                <th className={`${table.right} ${table.optional}`} title="Sum of personal best sectors (RaceGrid derived)">
                  Ideal lap
                </th>
                <th className={`${table.right} ${table.optionalNarrow}`}>Top speed</th>
                <th className={`${table.right} ${table.optional}`}>Laps</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => {
                const driver = labelFor(lookup, s.driverNumber);
                const isSelected = selected.includes(s.driverNumber);
                return (
                  <tr
                    key={s.driverNumber}
                    className={`${table.clickable} ${isSelected ? styles.picked : ''}`}
                    onClick={() => toggle(s.driverNumber)}
                    aria-selected={isSelected}
                  >
                    <td>
                      <DriverTag acronym={driver.acronym} color={driver.color} name={driver.name} />
                    </td>
                    <td className={`${table.right} ${table.time} ${table.strong}`}>{formatLapTime(s.bestLap?.lap_duration)}</td>
                    <td className={`${table.right} ${table.time} ${table.muted}`}>
                      {overallBest && s.bestLap?.lap_duration && s.bestLap.lap_duration !== overallBest
                        ? `+${(s.bestLap.lap_duration - overallBest).toFixed(3)}`
                        : '—'}
                    </td>
                    <td className={`${table.right} ${table.muted} ${table.optional}`}>{s.bestLap?.lap_number ?? '—'}</td>
                    {s.bestSectors.map((sector, i) => (
                      <td key={i} className={`${table.right} ${table.time} ${table.optionalNarrow} ${sector !== null && sector === overallSector[i] ? styles.fastest : ''}`}>
                        {formatLapTime(sector)}
                      </td>
                    ))}
                    <td className={`${table.right} ${table.time} ${table.optional}`}>{formatLapTime(s.idealLap)}</td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>{s.topSpeed ? `${s.topSpeed}` : '—'}</td>
                    <td className={`${table.right} ${table.muted} ${table.optional}`}>{s.laps}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
