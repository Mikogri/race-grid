import { IconArrowRight } from '@tabler/icons-react';
import { headToHead } from '../../analytics/driverStats';
import type { DriverInfo, SeasonModel } from '../../analytics/season';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/StateViews';
import { DriverTag } from '../../components/ui/TeamMarker';
import { formatDelta, formatPoints } from '../../lib/format';
import styles from './TeammateCard.module.css';

/** Head-to-head against the teammate with the most shared rounds in the same team. */
export function TeammateCard({ season, driver }: { season: SeasonModel; driver: DriverInfo }) {
  const own = (season.results.get(driver.driverNumber) ?? []).filter((r) => r.teamName === driver.teamName);
  const ownRounds = new Set(own.map((r) => r.round));
  const candidates = [...season.results.entries()]
    .filter(([number]) => number !== driver.driverNumber)
    .map(([number, results]) => ({ number, results: results.filter((r) => r.teamName === driver.teamName && ownRounds.has(r.round)) }))
    .filter((c) => c.results.length > 0)
    .sort((a, b) => b.results.length - a.results.length);
  const mate = candidates[0];
  const mateInfo = mate ? season.drivers.get(mate.number) : undefined;

  if (!mate || !mateInfo) {
    return (
      <Card title="Teammate comparison">
        <EmptyState title="No teammate with shared rounds" />
      </Card>
    );
  }

  const h2h = headToHead(own, mate.results);
  const rows: { label: string; a: string; b: string; aWins: boolean | null }[] = [
    { label: 'Qualifying H2H', a: String(h2h.qualifyingA), b: String(h2h.qualifyingB), aWins: h2h.qualifyingA === h2h.qualifyingB ? null : h2h.qualifyingA > h2h.qualifyingB },
    { label: 'Race H2H', a: String(h2h.raceA), b: String(h2h.raceB), aWins: h2h.raceA === h2h.raceB ? null : h2h.raceA > h2h.raceB },
    { label: 'Points (shared rounds)', a: formatPoints(h2h.pointsA), b: formatPoints(h2h.pointsB), aWins: h2h.pointsA === h2h.pointsB ? null : h2h.pointsA > h2h.pointsB },
  ];

  return (
    <Card title="Teammate comparison">
      <div className={styles.names}>
        <DriverTag acronym={driver.acronym} color={driver.color} />
        <span className={styles.vs}>vs</span>
        <DriverTag acronym={mateInfo.acronym} color={mateInfo.color} />
      </div>
      <ul className={styles.rows}>
        {rows.map((row) => (
          <li key={row.label}>
            <span className={row.aWins === true ? styles.win : styles.value}>{row.a}</span>
            <span className={styles.label}>{row.label}</span>
            <span className={row.aWins === false ? styles.win : styles.value}>{row.b}</span>
          </li>
        ))}
        <li>
          <span className={styles.value}>{formatDelta(h2h.medianQualifyingGap)}</span>
          <span className={styles.label} title="Median of the qualifying time difference, compared in the last phase both drivers set a time.">
            Median quali gap (s)
          </span>
          <span className={styles.value} />
        </li>
      </ul>
      <p className={styles.caption}>
        {h2h.rounds} shared rounds. Race pace gap needs lap data — open the full comparison for lap-based pace.
      </p>
      <ButtonLink
        variant="ghost"
        to={`/compare?a=${season.year}-${driver.driverNumber}&b=${season.year}-${mateInfo.driverNumber}`}
      >
        Full comparison
        <IconArrowRight size={14} stroke={1.5} aria-hidden="true" />
      </ButtonLink>
    </Card>
  );
}
