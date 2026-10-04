import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { SeasonModel } from '../../analytics/season';
import { useSelectedSeason } from '../../app/seasons';
import { Avatar } from '../../components/ui/Avatar';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { useSeason } from '../../data/season';
import { formatPoints } from '../../lib/format';
import styles from './ConstructorsPage.module.css';

/** Constructors (menu: Race → Constructors): the season's teams in championship order; each card opens the team page. */
export function ConstructorsPage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);
  return (
    <>
      <PageHeader title={`${year} Constructors`} description="Every team on the grid this season, with its drivers, in championship order." />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending || !season ? (
        <PageSkeleton layout="cards" />
      ) : season.teams.size === 0 ? (
        <EmptyState title="No constructors yet">OpenF1 lists teams once the first session of the season has run.</EmptyState>
      ) : (
        <TeamGrid season={season} />
      )}
    </>
  );
}

function TeamGrid({ season }: { season: SeasonModel }) {
  const standings = new Map(season.teamStandings.map((s) => [s.teamName, s]));
  const order = (name: string) => standings.get(name)?.position ?? Number.MAX_SAFE_INTEGER;
  const driverStanding = new Map(season.driverStandings.map((s) => [s.driverNumber, s]));
  const wins = (numbers: number[], teamName: string) =>
    numbers.reduce((sum, n) => sum + (season.results.get(n) ?? []).filter((r) => r.finish === 1 && r.teamName === teamName).length, 0);
  const teams = [...season.teams.values()].sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name));
  return (
    <ul className={styles.grid}>
      {teams.map((team) => {
        const standing = standings.get(team.name);
        return (
          <li key={team.slug}>
            <Link to={`/constructors/${season.year}/${team.slug}`} className={styles.card} style={{ '--team': team.color } as CSSProperties}>
              <span className={styles.head}>
                <span className={styles.name}>{team.name}</span>
                <span className={styles.position}>{standing?.position ? `P${standing.position}` : '—'}</span>
              </span>
              <span className={styles.total}>
                <span className={`${styles.totalValue} tabular`}>{standing ? formatPoints(standing.points) : '—'}</span>
                <span className={styles.totalUnit}>points</span>
              </span>
              <span className={styles.drivers}>
                {team.driverNumbers.map((n) => {
                  const driver = season.drivers.get(n);
                  const name = driver?.fullName ?? `Car ${n}`;
                  const driverPoints = driverStanding.get(n)?.points;
                  return (
                    <span key={n} className={styles.driver}>
                      <Avatar src={driver?.headshotUrl} name={name} ring={team.color} />
                      <span className={styles.driverText}>
                        <span className={styles.driverName}>{name}</span>
                        <span className={styles.driverMeta}>
                          #{n} · {driverPoints !== undefined ? `${formatPoints(driverPoints)} p` : '—'}
                        </span>
                      </span>
                    </span>
                  );
                })}
              </span>
              <span className={styles.footer}>
                <span>Wins</span>
                <span className="tabular">{wins(team.driverNumbers, team.name)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
