import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import {
  IconArrowRight,
  IconCalendarDue,
  IconCube,
  IconFlag,
  IconLaurelWreath,
  IconListDetails,
  IconPlayerPlayFilled,
  IconSparkle2,
  IconSparkles,
  IconTrophy,
  IconUsersGroup,
} from '@tabler/icons-react';
import { formTable, seasonInsights } from '../../analytics/insights';
import type { RoundInfo, SeasonModel } from '../../analytics/season';
import { useSelectedSeason } from '../../app/seasons';
import { PositionChange } from '../../components/PositionChange';
import { Avatar } from '../../components/ui/Avatar';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { MetricGroup } from '../../components/ui/Metric';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import { TrackOutline } from '../../components/ui/TrackOutline';
import { useCircuitsByKey } from '../../data/circuits';
import { useSeason } from '../../data/season';
import { useSessionData } from '../../data/sessionData';
import { formatCountdown, formatDateRange, formatDuration, formatGap, formatPoints } from '../../lib/format';
import { UNKNOWN_TEAM_COLOR } from '../../lib/teams';
import { squareFrame } from '../../lib/trackFrame';
import styles from './DashboardPage.module.css';

/**
 * Season dashboard: the latest race (podium, replay) and the next round side by side, season KPIs, then the
 * two championships as colour bars and RaceGrid insights.
 */
export function DashboardPage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);

  const grandPrix = season?.rounds.filter((r) => r.round !== null) ?? [];
  const latest = season?.completedRounds[season.completedRounds.length - 1];
  const next = grandPrix.find((r) => r.status === 'upcoming' || r.status === 'in-progress');

  return (
    <>
      <PageHeader title={`${year} Season`} description="The latest race, what is next, and where both championships stand." />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending || !season ? (
        <Skeleton rows={12} />
      ) : latest ? (
        <>
          <div className={styles.top}>
            <LatestRace season={season} round={latest} />
            {next ? <NextRound round={next} /> : <SeasonComplete year={year} />}
          </div>
          <SeasonKpis season={season} totalRounds={grandPrix.length} />
          <div className={styles.bottom}>
            <DriversChampionship season={season} />
            <ConstructorsChampionship season={season} />
            <Insights season={season} />
          </div>
        </>
      ) : (
        <EmptyState title="No completed Grand Prix yet">Results appear after the first race of the {year} season.</EmptyState>
      )}
    </>
  );
}

/** Circuit outline rotated to fill a square tile. */
function Outline({ outline, title }: { outline: string; title: string }) {
  const frame = squareFrame(outline);
  if (!frame) return null;
  return (
    <TrackOutline
      outline={outline}
      variant="thumb"
      viewBox={`${frame.viewBox.x} ${frame.viewBox.y} ${frame.viewBox.width} ${frame.viewBox.height}`}
      rotation={frame}
      title={title}
      className={styles.outline}
    />
  );
}

function SeasonKpis({ season, totalRounds }: { season: SeasonModel; totalRounds: number }) {
  const [leader, second] = season.driverStandings;
  const [teamLeader, teamSecond] = season.teamStandings;
  const lastName = (n: number) => season.drivers.get(n)?.lastName ?? `#${n}`;
  const completed = season.completedRounds.length;
  return (
    <MetricGroup
      items={[
        {
          label: 'Rounds completed',
          icon: <IconFlag stroke={1.5} />,
          value: `${completed} / ${totalRounds}`,
          numeric: true,
          sub: 'Grand Prix',
          trend: { value: `${totalRounds ? Math.round((completed / totalRounds) * 100) : 0}%`, direction: 'up' },
        },
        {
          label: "Drivers' leader",
          icon: <IconSparkle2 stroke={1.5} />,
          value: leader ? lastName(leader.driverNumber) : '—',
          sub: leader ? `${formatPoints(leader.points)} points` : undefined,
          trend: leader && second ? { value: `+${formatPoints(leader.points - second.points)}`, direction: 'up' } : undefined,
        },
        {
          label: "Constructors' leader",
          icon: <IconCube stroke={1.5} />,
          value: teamLeader?.teamName ?? '—',
          sub: teamLeader ? `${formatPoints(teamLeader.points)} points` : undefined,
          trend: teamLeader && teamSecond ? { value: `+${formatPoints(teamLeader.points - teamSecond.points)}`, direction: 'up' } : undefined,
        },
        {
          label: 'Different winners',
          icon: <IconLaurelWreath stroke={1.5} />,
          value: new Set([...season.results].filter(([, rs]) => rs.some((r) => r.finish === 1)).map(([n]) => n)).size,
          numeric: true,
          sub: 'Grand Prix winners this season',
        },
      ]}
    />
  );
}

/** Feature panel: the latest Grand Prix with its podium as portraits, and the replay. */
function LatestRace({ season, round }: { season: SeasonModel; round: RoundInfo }) {
  const circuits = useCircuitsByKey();
  const results = useSessionData('session_result', round.race);
  const circuit = circuits.byKey.get(round.meeting.circuit_key);
  const podium = [...(results.data ?? [])].filter((r) => r.position !== null && r.position <= 3).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  // P2 · P1 · P3, as on a real podium.
  const ordered = [podium[1], podium[0], podium[2]].filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <Card
      icon={<IconTrophy stroke={1.5} />}
      title="Latest race"
      description={`Round ${round.round} · ${formatDateRange(round.meeting.date_start, round.meeting.date_end)}`}
      className={styles.latest}
    >
      <div className={styles.latestBody}>
        <div className={styles.latestInfo}>
          <div className={styles.latestMap}>{circuit?.outline && <Outline outline={circuit.outline} title={`${circuit.name} outline`} />}</div>
          <div>
            <p className={styles.raceName}>
              {round.meeting.country_flag && <img src={round.meeting.country_flag} alt="" className={styles.flag} />}
              {round.meeting.meeting_name}
            </p>
            <p className={styles.raceSub}>
              {round.meeting.circuit_short_name} · {round.meeting.country_name}
            </p>
          </div>
          <div className={styles.actions}>
            {round.race && (
              <ButtonLink to={`/replay/${round.race.session_key}`} variant="primary" icon={<IconPlayerPlayFilled size={14} aria-hidden="true" />}>
                Open replay
              </ButtonLink>
            )}
            <ButtonLink to={`/rounds/${round.meeting.meeting_key}`} variant="secondary" icon={<IconListDetails size={15} stroke={1.5} aria-hidden="true" />}>
              Details
            </ButtonLink>
          </div>
        </div>
        <ol className={styles.podium}>
          {results.isPending
            ? [2, 1, 3].map((p) => <li key={p} className={styles.step} data-place={p} />)
            : ordered.map((r) => {
                const driver = season.drivers.get(r.driver_number);
                const name = driver?.fullName ?? `#${r.driver_number}`;
                return (
                  <li key={r.driver_number} className={styles.step} data-place={r.position} style={{ '--team': driver?.color ?? UNKNOWN_TEAM_COLOR } as CSSProperties}>
                    <Link to={`/drivers/${season.year}/${r.driver_number}`} className={styles.stepDriver}>
                      <Avatar src={driver?.headshotUrl} name={name} size="lg" ring={driver?.color} />
                      <span className={styles.stepName}>{driver?.lastName ?? name}</span>
                      <span className={styles.stepTeam}>{driver?.teamName}</span>
                      <span className={`${styles.stepTime} tabular`}>
                        {r.position === 1 && typeof r.duration === 'number' ? formatDuration(r.duration) : Array.isArray(r.gap_to_leader) ? '' : formatGap(r.gap_to_leader)}
                      </span>
                    </Link>
                    <span className={styles.block}>P{r.position}</span>
                  </li>
                );
              })}
        </ol>
      </div>
    </Card>
  );
}

function NextRound({ round }: { round: RoundInfo }) {
  const circuits = useCircuitsByKey();
  const circuit = circuits.byKey.get(round.meeting.circuit_key);
  return (
    <Card icon={<IconCalendarDue stroke={1.5} />} title={round.status === 'in-progress' ? 'This weekend' : 'Next round'} className={styles.next}>
      <Link to={`/rounds/${round.meeting.meeting_key}`} className={styles.nextBody}>
        <span className={styles.countdown}>{round.status === 'in-progress' ? 'Live now' : formatCountdown(round.meeting.date_start)}</span>
        <div className={styles.nextMap}>{circuit?.outline && <Outline outline={circuit.outline} title={`${circuit.name} outline`} />}</div>
        <p className={styles.raceName}>
          {round.meeting.country_flag && <img src={round.meeting.country_flag} alt="" className={styles.flag} />}
          {round.meeting.meeting_name}
        </p>
        <p className={styles.raceSub}>
          Round {round.round} · {formatDateRange(round.meeting.date_start, round.meeting.date_end)}
          {round.sprint ? ' · Sprint weekend' : ''}
        </p>
      </Link>
    </Card>
  );
}

function SeasonComplete({ year }: { year: number }) {
  return (
    <Card icon={<IconCalendarDue stroke={1.5} />} title="Season complete" className={styles.next}>
      <EmptyState title={`The ${year} season is over`}>Browse every round in the calendar.</EmptyState>
    </Card>
  );
}

const fullStandings = (
  <Link to="/standings" className={styles.link}>
    Full standings <IconArrowRight size={14} stroke={1.5} aria-hidden="true" />
  </Link>
);

/** Top ten drivers: portrait, name, three-race move and a team-colour bar of points. */
function DriversChampionship({ season }: { season: SeasonModel }) {
  const form = new Map(formTable(season).map((f) => [f.driverNumber, f]));
  const leader = season.driverStandings[0]?.points ?? 0;
  return (
    <Card icon={<IconLaurelWreath stroke={1.5} />} title="Drivers' championship" actions={fullStandings}>
      <ol className={styles.ranking}>
        {season.driverStandings.slice(0, 10).map((s, i) => {
          const driver = season.drivers.get(s.driverNumber);
          const name = driver?.fullName ?? `#${s.driverNumber}`;
          const move = form.get(s.driverNumber)?.positionChange;
          return (
            <li key={s.driverNumber}>
              <Link to={`/drivers/${season.year}/${s.driverNumber}`} className={styles.rankRow} style={{ '--team': driver?.color ?? UNKNOWN_TEAM_COLOR, '--i': i } as CSSProperties}>
                <span className={styles.rankPos}>{s.position}</span>
                <Avatar src={driver?.headshotUrl} name={name} size="sm" />
                <span className={styles.rankName}>{name}</span>
                <span className={styles.rankMove}>{move != null ? <PositionChange from={(s.position ?? 0) + move} to={s.position} /> : null}</span>
                <span className={`${styles.rankPoints} tabular`}>{formatPoints(s.points)}</span>
                <span className={styles.rankBar} aria-hidden="true">
                  <span style={{ width: `${leader ? (s.points / leader) * 100 : 0}%` }} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function ConstructorsChampionship({ season }: { season: SeasonModel }) {
  const leader = season.teamStandings[0]?.points ?? 0;
  return (
    <Card icon={<IconUsersGroup stroke={1.5} />} title="Constructors" actions={fullStandings}>
      <ol className={styles.ranking}>
        {season.teamStandings.map((t, i) => {
          const team = season.teams.get(t.teamName);
          return (
            <li key={t.teamName}>
              <Link to={`/constructors/${season.year}/${team?.slug ?? ''}`} className={styles.rankRow} style={{ '--team': team?.color ?? UNKNOWN_TEAM_COLOR, '--i': i } as CSSProperties}>
                <span className={styles.rankPos}>{t.position}</span>
                <span className={styles.teamSwatch} aria-hidden="true" />
                <span className={styles.rankName}>{t.teamName}</span>
                <span className={styles.rankMove} />
                <span className={`${styles.rankPoints} tabular`}>{formatPoints(t.points)}</span>
                <span className={styles.rankBar} aria-hidden="true">
                  <span style={{ width: `${leader ? (t.points / leader) * 100 : 0}%` }} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Insights({ season }: { season: SeasonModel }) {
  const insights = seasonInsights(season);
  return (
    <Card icon={<IconSparkles stroke={1.5} />} title="RaceGrid insights">
      {insights.length === 0 ? (
        <EmptyState title="Not enough rounds for insights yet" />
      ) : (
        <ul className={styles.insights}>
          {insights.map((insight) => (
            <li key={insight.id} title={insight.basis}>
              {insight.to ? (
                <Link to={insight.to} className={styles.insightLink}>
                  {insight.text}
                </Link>
              ) : (
                insight.text
              )}
              <span className={styles.basis}>{insight.basis}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
