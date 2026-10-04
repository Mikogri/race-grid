import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { IconCube, IconFlag, IconLaurelWreath, IconSparkle2, IconUsersGroup } from '@tabler/icons-react';
import { championshipOutlook } from '../../analytics/championship';
import { summarize } from '../../analytics/driverStats';
import type { SeasonModel } from '../../analytics/season';
import { useSelectedSeason } from '../../app/seasons';
import { PositionChange } from '../../components/PositionChange';
import { Avatar } from '../../components/ui/Avatar';
import { Panel } from '../../components/ui/Card';
import { MetricGroup, type MetricItem } from '../../components/ui/Metric';
import { PageHeader } from '../../components/ui/PageHeader';
import { SortHeader } from '../../components/ui/SortHeader';
import { sortBy, useSort } from '../../components/ui/sort';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import table from '../../components/ui/Table.module.css';
import { Tabs } from '../../components/ui/Tabs';
import { TeamMarker } from '../../components/ui/TeamMarker';
import { useSeason } from '../../data/season';
import { driverCountry } from '../../lib/countries';
import { formatPoints } from '../../lib/format';
import { UNKNOWN_TEAM_COLOR } from '../../lib/teams';
import styles from './StandingsPage.module.css';

type View = 'drivers' | 'constructors';

const points = (value: number) => `${formatPoints(value)} p`;
const gapTo = (leader: number, value: number) => (value === leader ? '—' : `−${formatPoints(leader - value)} p`);

export function StandingsPage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);
  const [view, setView] = useState<View>('drivers');
  const latest = season?.standingsHistory[season.standingsHistory.length - 1];
  const hasData = Boolean(season && season.driverStandings.length > 0);

  return (
    <>
      <PageHeader
        title={`${year} Championship Season`}
        description={
          latest
            ? `Standings after the ${latest.session.location} ${latest.session.session_name.toLowerCase()}. Wins and podiums count Grand Prix races only.`
            : 'Explore every race of the season, from lights out to the chequered flag.'
        }
      />
      <Tabs
        label="Championship"
        value={view}
        onChange={setView}
        items={[
          { id: 'drivers', label: 'Drivers' },
          { id: 'constructors', label: 'Constructors' },
        ]}
      />
      {season && hasData && <ChampionshipSummary season={season} />}
      <Panel
        padded={false}
        icon={view === 'drivers' ? <IconLaurelWreath stroke={1.5} /> : <IconUsersGroup stroke={1.5} />}
        title={view === 'drivers' ? 'Drivers Standings' : 'Constructors Standings'}
      >
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isPending || !season ? (
          <Skeleton rows={12} />
        ) : !hasData ? (
          <EmptyState title="No championship data yet">OpenF1 publishes standings after the first points-scoring session of the season.</EmptyState>
        ) : view === 'drivers' ? (
          <DriverStandingsTable season={season} />
        ) : (
          <TeamStandingsTable season={season} />
        )}
        <p className={table.caption}>Source: OpenF1 championship_drivers / championship_teams. Change = movement during the latest race or sprint.</p>
      </Panel>
    </>
  );
}

/** Four KPI cards: leader, margin, season progress and the points still on the table. */
function ChampionshipSummary({ season }: { season: SeasonModel }) {
  const [leader, second] = season.driverStandings;
  const outlook = championshipOutlook(season);
  const name = (n: number | undefined) => (n === undefined ? '—' : (season.drivers.get(n)?.lastName ?? `#${n}`));
  const gained = leader && leader.pointsStart !== null ? leader.points - leader.pointsStart : null;
  const margin = leader && second ? leader.points - second.points : null;
  const marginBefore = leader?.pointsStart != null && second?.pointsStart != null ? leader.pointsStart - second.pointsStart : null;
  const marginChange = margin !== null && marginBefore !== null ? margin - marginBefore : null;
  const completed = season.completedRounds.length;

  const items: MetricItem[] = [
    {
      label: 'Leader',
      icon: <IconSparkle2 stroke={1.5} />,
      value: name(leader?.driverNumber),
      sub: leader ? `${points(leader.points)} in total` : undefined,
      trend: gained !== null ? { value: `+${formatPoints(gained)}`, direction: gained > 0 ? 'up' : 'flat' } : undefined,
      hint: 'Championship leader; the chip shows points scored in the latest race or sprint.',
    },
    {
      label: 'Lead',
      icon: <IconFlag stroke={1.5} />,
      value: margin !== null ? `${formatPoints(margin)} p` : '—',
      numeric: true,
      sub: second ? `Over ${name(second.driverNumber)}` : undefined,
      trend:
        marginChange !== null
          ? { value: `${marginChange > 0 ? '+' : marginChange < 0 ? '−' : ''}${formatPoints(Math.abs(marginChange))}`, direction: marginChange > 0 ? 'up' : marginChange < 0 ? 'down' : 'flat' }
          : undefined,
      hint: 'Points between P1 and P2; the chip shows how the gap changed in the latest session.',
    },
    {
      label: 'Season progress',
      icon: <IconCube stroke={1.5} />,
      value: outlook.totalRounds ? `${Math.round((completed / outlook.totalRounds) * 100)}%` : '—',
      numeric: true,
      sub: `${completed} of ${outlook.totalRounds} rounds`,
      trend: { value: `${outlook.remainingRaces} left`, direction: 'flat' },
    },
    {
      label: 'Points available',
      icon: <IconLaurelWreath stroke={1.5} />,
      value: formatPoints(outlook.pointsAvailable),
      numeric: true,
      sub: 'Drivers in contention',
      trend: { value: outlook.contenders, direction: 'flat' },
      hint: `Maximum one driver can still score: ${outlook.remainingRaces} races and ${outlook.remainingSprints} sprints.`,
    },
  ];
  return <MetricGroup items={items} />;
}

type DriverSortKey = 'position' | 'driver' | 'number' | 'team' | 'wins' | 'podiums' | 'gap' | 'points';

function DriverStandingsTable({ season }: { season: SeasonModel }) {
  const navigate = useNavigate();
  const [sort, onSort] = useSort<DriverSortKey>({ key: 'position', direction: 'asc' });
  const leaderPoints = season.driverStandings[0]?.points ?? 0;
  const rows = season.driverStandings.map((standing) => {
    const driver = season.drivers.get(standing.driverNumber);
    return { standing, driver, name: driver?.fullName ?? `Car ${standing.driverNumber}`, summary: summarize(season.results.get(standing.driverNumber) ?? []) };
  });
  const value: Record<DriverSortKey, (row: (typeof rows)[number]) => number | string | null> = {
    position: (r) => r.standing.position,
    driver: (r) => r.name,
    number: (r) => r.standing.driverNumber,
    team: (r) => r.driver?.teamName ?? null,
    wins: (r) => r.summary.wins,
    podiums: (r) => r.summary.podiums,
    gap: (r) => leaderPoints - r.standing.points,
    points: (r) => r.standing.points,
  };
  const header = { sort, onSort };

  return (
    <div className={table.wrap}>
      <table className={`${table.table} ${table.large}`}>
        <thead>
          <tr>
            <SortHeader {...header} label="Position" sortKey="position" />
            <SortHeader {...header} label="Driver" sortKey="driver" />
            <SortHeader {...header} label="Number" sortKey="number" className={table.optionalNarrow} />
            <SortHeader {...header} label="Team" sortKey="team" className={table.optional} />
            <SortHeader {...header} label="Wins" sortKey="wins" natural="desc" className={table.optionalNarrow} />
            <SortHeader {...header} label="Podiums" sortKey="podiums" natural="desc" className={table.optionalNarrow} />
            <SortHeader {...header} label="Gap" sortKey="gap" className={table.optionalNarrow} />
            <SortHeader {...header} label="Points" sortKey="points" natural="desc" />
          </tr>
        </thead>
        <tbody>
          {sortBy(rows, value[sort.key], sort.direction).map(({ standing, driver, name, summary }) => {
            const to = `/drivers/${season.year}/${standing.driverNumber}`;
            return (
              <tr key={standing.driverNumber} className={table.clickable} onClick={() => navigate(to)}>
                <td>
                  <span className={styles.position}>
                    <span className={styles.positionNumber}>{standing.position ?? '—'}</span>
                    <span className={table.optionalNarrow}>
                      <PositionChange from={standing.positionStart} to={standing.position} />
                    </span>
                  </span>
                </td>
                <td>
                  <span className={styles.driver}>
                    <Avatar src={driver?.headshotUrl} name={name} ring={driver?.color} />
                    <span className={styles.driverText}>
                      {/* Real link for keyboard and middle-click; the row click is a mouse convenience. */}
                      <Link to={to} className={`${table.primary} ${table.link} ${styles.driverName}`} onClick={(e) => e.stopPropagation()}>
                        {name}
                      </Link>
                      <span className={styles.country}>{driverCountry(driver) ?? '—'}</span>
                    </span>
                  </span>
                </td>
                <td className={table.optionalNarrow}>#{standing.driverNumber}</td>
                <td className={table.optional}>
                  <span className={styles.team}>
                    <TeamMarker color={driver?.color ?? UNKNOWN_TEAM_COLOR} />
                    <span>{driver?.teamName ?? '—'}</span>
                  </span>
                </td>
                <td className={table.optionalNarrow}>{summary.wins}</td>
                <td className={table.optionalNarrow}>{summary.podiums}</td>
                <td className={table.optionalNarrow}>{gapTo(leaderPoints, standing.points)}</td>
                <td className={table.strong}>{points(standing.points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type TeamSortKey = 'position' | 'team' | 'wins' | 'gap' | 'points';

function TeamStandingsTable({ season }: { season: SeasonModel }) {
  const navigate = useNavigate();
  const [sort, onSort] = useSort<TeamSortKey>({ key: 'position', direction: 'asc' });
  const leaderPoints = season.teamStandings[0]?.points ?? 0;
  const rows = season.teamStandings.map((standing) => {
    const team = season.teams.get(standing.teamName);
    const wins = (team?.driverNumbers ?? []).reduce(
      (sum, n) => sum + (season.results.get(n) ?? []).filter((r) => r.finish === 1 && r.teamName === standing.teamName).length,
      0,
    );
    return { standing, team, wins };
  });
  const value: Record<TeamSortKey, (row: (typeof rows)[number]) => number | string | null> = {
    position: (r) => r.standing.position,
    team: (r) => r.standing.teamName,
    wins: (r) => r.wins,
    gap: (r) => leaderPoints - r.standing.points,
    points: (r) => r.standing.points,
  };
  const header = { sort, onSort };

  return (
    <div className={table.wrap}>
      <table className={table.table}>
        <thead>
          <tr>
            <SortHeader {...header} label="Position" sortKey="position" />
            <SortHeader {...header} label="Constructor" sortKey="team" />
            <th className={table.optional}>Drivers</th>
            <SortHeader {...header} label="Wins" sortKey="wins" natural="desc" className={table.optionalNarrow} />
            <SortHeader {...header} label="Gap" sortKey="gap" className={table.optionalNarrow} />
            <SortHeader {...header} label="Points" sortKey="points" natural="desc" />
          </tr>
        </thead>
        <tbody>
          {sortBy(rows, value[sort.key], sort.direction).map(({ standing, team, wins }) => {
            const to = `/constructors/${season.year}/${team?.slug ?? ''}`;
            return (
              <tr key={standing.teamName} className={team ? table.clickable : undefined} onClick={() => team && navigate(to)}>
                <td>
                  <span className={styles.position}>
                    <span className={styles.positionNumber}>{standing.position ?? '—'}</span>
                    <span className={table.optionalNarrow}>
                      <PositionChange from={standing.positionStart} to={standing.position} />
                    </span>
                  </span>
                </td>
                <td>
                  <span className={styles.team}>
                    <TeamMarker color={team?.color ?? UNKNOWN_TEAM_COLOR} />
                    {team ? (
                      <Link to={to} className={`${table.primary} ${table.link}`} onClick={(e) => e.stopPropagation()}>
                        {standing.teamName}
                      </Link>
                    ) : (
                      <span>{standing.teamName}</span>
                    )}
                  </span>
                </td>
                <td className={table.optional}>{(team?.driverNumbers ?? []).map((n) => season.drivers.get(n)?.acronym ?? n).join(' · ')}</td>
                <td className={table.optionalNarrow}>{wins}</td>
                <td className={table.optionalNarrow}>{gapTo(leaderPoints, standing.points)}</td>
                <td className={table.strong}>{points(standing.points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
