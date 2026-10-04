import { IconArrowRight, IconUserHexagon } from '@tabler/icons-react';
import { summarize } from '../../analytics/driverStats';
import type { SeasonModel } from '../../analytics/season';
import { PositionChange } from '../../components/PositionChange';
import { Avatar } from '../../components/ui/Avatar';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DetailList } from '../../components/ui/DetailList';
import { TeamMarker } from '../../components/ui/TeamMarker';
import { driverCountry } from '../../lib/countries';
import { formatPoints } from '../../lib/format';
import { UNKNOWN_TEAM_COLOR } from '../../lib/teams';
import styles from './StandingsPage.module.css';

/** Quick summary of one driver beside the standings table (opened from a row's summary button). */
export function DriverPreview({ season, driverNumber }: { season: SeasonModel; driverNumber: number }) {
  const driver = season.drivers.get(driverNumber);
  const standing = season.driverStandings.find((row) => row.driverNumber === driverNumber);
  const leaderPoints = season.driverStandings[0]?.points ?? 0;
  const summary = summarize(season.results.get(driverNumber) ?? []);
  const name = driver?.fullName ?? `Car ${driverNumber}`;

  return (
    <Card
      icon={<IconUserHexagon stroke={1.5} />}
      title="Championship leader"
      actions={
        <ButtonLink to={`/drivers/${season.year}/${driverNumber}`} variant="secondary" icon={<IconArrowRight size={14} stroke={1.5} aria-hidden="true" />}>
          Driver page
        </ButtonLink>
      }
    >
      <div className={styles.profile}>
        <Avatar src={driver?.headshotUrl} name={name} size="lg" ring={driver?.color} />
        <div className={styles.profileText}>
          <p className={styles.profileName}>{name}</p>
          <p className={styles.profileTeam}>
            <TeamMarker color={driver?.color ?? UNKNOWN_TEAM_COLOR} />
            <span>{driver?.teamName ?? '—'}</span>
          </p>
          <p className={styles.country}>
            <span className="mono">#{driverNumber}</span> · {driverCountry(driver) ?? 'Country unknown'}
          </p>
        </div>
      </div>
      <DetailList
        items={[
          { label: 'Championship position', value: standing?.position ? `P${standing.position}` : '—' },
          { label: 'Points', value: standing ? formatPoints(standing.points) : '—' },
          {
            label: 'Gap to leader',
            value: !standing ? '—' : standing.points === leaderPoints ? 'Leader' : `−${formatPoints(leaderPoints - standing.points)}`,
          },
          {
            label: 'Change in latest session',
            value: standing ? <PositionChange from={standing.positionStart} to={standing.position} /> : '—',
          },
          { label: 'Wins', value: summary.wins },
          { label: 'Podiums', value: summary.podiums },
          { label: 'Poles', value: summary.poles },
          { label: 'Best finish', value: summary.bestFinish ? `P${summary.bestFinish}` : '—' },
          { label: 'Starts', value: summary.starts },
        ]}
      />
    </Card>
  );
}
