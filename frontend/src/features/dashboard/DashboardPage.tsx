import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import {
  IconArrowRight,
  IconBulb,
  IconListDetails,
  IconPlayerPlayFilled,
  IconRoute,
} from "@tabler/icons-react";
import { formTable, seasonInsights } from "../../analytics/insights";
import type { RoundInfo, SeasonModel } from "../../analytics/season";
import { useSelectedSeason } from "../../app/seasons";
import { PositionChange } from "../../components/PositionChange";
import { Avatar } from "../../components/ui/Avatar";
import { ButtonLink } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from "../../components/ui/StateViews";
import { PageSkeleton } from "../../components/ui/PageSkeleton";
import { TeamMarker } from "../../components/ui/TeamMarker";
import { TrackOutline } from "../../components/ui/TrackOutline";
import { useCircuitsByKey } from "../../data/circuits";
import { useSeason } from "../../data/season";
import { useSessionData } from "../../data/sessionData";
import {
  formatDateRange,
  formatDuration,
  formatGap,
  formatPoints,
} from "../../lib/format";
import { UNKNOWN_TEAM_COLOR } from "../../lib/teams";
import { squareFrame } from "../../lib/trackFrame";
import styles from "./DashboardPage.module.css";

/**
 * Season dashboard. Top: the latest race as a hero (winner, podium, circuit) beside the next round's countdown and
 * the season's progress. Middle: both championships. Bottom: RaceGrid insights as cards.
 */
export function DashboardPage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);

  const grandPrix = season?.rounds.filter((r) => r.round !== null) ?? [];
  const latest = season?.completedRounds[season.completedRounds.length - 1];
  const next = grandPrix.find(
    (r) => r.status === "upcoming" || r.status === "in-progress",
  );

  return (
    <>
      <PageHeader
        title={`${year} Season`}
        description="The latest race, what is next, and where both championships stand."
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending || !season ? (
        <PageSkeleton layout="dashboard" />
      ) : latest ? (
        <>
          <div className={`${styles.top} rg-stagger`}>
            <LatestRace season={season} round={latest} />
            <div className={styles.side}>
              {next ? (
                <NextRound round={next} />
              ) : (
                <SeasonComplete year={year} />
              )}
              <SeasonProgress season={season} rounds={grandPrix} />
            </div>
          </div>
          <div className={`${styles.championships} rg-stagger`}>
            <DriversChampionship season={season} />
            <ConstructorsChampionship season={season} />
          </div>
          <Insights season={season} />
        </>
      ) : (
        <EmptyState title="No completed Grand Prix yet">
          Results appear after the first race of the {year} season.
        </EmptyState>
      )}
    </>
  );
}

/** Circuit outline rotated to fill a square box; the circuit name when the local library has no outline for it. */
function CircuitMap({
  outline,
  name,
  className,
}: {
  outline: string | null | undefined;
  name: string;
  className: string;
}) {
  const frame = outline ? squareFrame(outline) : null;
  return (
    <div className={className}>
      {outline && frame ? (
        <TrackOutline
          outline={outline}
          variant="thumb"
          viewBox={`${frame.viewBox.x} ${frame.viewBox.y} ${frame.viewBox.width} ${frame.viewBox.height}`}
          rotation={frame}
          title={`${name} outline`}
          className={styles.outline}
        />
      ) : (
        <span className={styles.mapEmpty}>
          <IconRoute stroke={1.5} aria-hidden="true" />
          {name}
          <span>No outline in the circuit library yet</span>
        </span>
      )}
    </div>
  );
}

/** Hero: race and winner on the left, the circuit drawn large on the right, P2 and P3 under the winner. */
function LatestRace({
  season,
  round,
}: {
  season: SeasonModel;
  round: RoundInfo;
}) {
  const circuits = useCircuitsByKey();
  const results = useSessionData("session_result", round.race);
  const circuit = circuits.byKey.get(round.meeting.circuit_key);
  const rows = results.data ?? [];
  const podium = rows
    .filter((r) => r.position !== null && r.position <= 3)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const [winner, ...runnersUp] = podium;
  const winnerInfo = winner
    ? season.drivers.get(winner.driver_number)
    : undefined;
  const classified = rows.filter(
    (r) => r.position !== null && !r.dnf && !r.dns && !r.dsq,
  ).length;

  return (
    <section
      className={styles.hero}
      style={
        { "--team": winnerInfo?.color ?? UNKNOWN_TEAM_COLOR } as CSSProperties
      }
    >
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>
          Latest race · Round {round.round} ·{" "}
          {formatDateRange(round.meeting.date_start, round.meeting.date_end)}
        </p>
        <h2 className={styles.heroTitle}>
          {round.meeting.country_flag && (
            <img
              src={round.meeting.country_flag}
              alt=""
              className={styles.flag}
            />
          )}
          {round.meeting.meeting_name}
        </h2>
        <p className={styles.heroSub}>
          {round.meeting.circuit_short_name} · {round.meeting.country_name}
        </p>

        {results.isPending ? (
          <Skeleton rows={3} />
        ) : winner ? (
          <>
            <Link
              to={`/drivers/${season.year}/${winner.driver_number}`}
              className={styles.winner}
            >
              <Avatar
                src={winnerInfo?.headshotUrl}
                name={winnerInfo?.fullName ?? `#${winner.driver_number}`}
                size="lg"
                ring={winnerInfo?.color}
              />
              <span className={styles.winnerText}>
                <span className={styles.eyebrow}>Winner</span>
                <span className={styles.winnerName}>
                  {winnerInfo?.fullName ?? `#${winner.driver_number}`}
                </span>
                <span className={styles.winnerMeta}>
                  {winnerInfo?.teamName}
                  {typeof winner.duration === "number" && (
                    <span className="mono">
                      {" "}
                      · {formatDuration(winner.duration)}
                    </span>
                  )}
                </span>
              </span>
            </Link>
            <ol className={styles.runnersUp}>
              {runnersUp.map((r) => {
                const driver = season.drivers.get(r.driver_number);
                return (
                  <li key={r.driver_number}>
                    <Link
                      to={`/drivers/${season.year}/${r.driver_number}`}
                      className={styles.runner}
                    >
                      <span className={styles.runnerPos}>P{r.position}</span>
                      <TeamMarker color={driver?.color ?? UNKNOWN_TEAM_COLOR} />
                      <span className={styles.runnerName}>
                        {driver?.lastName ?? `#${r.driver_number}`}
                      </span>
                      <span className={styles.runnerGap}>
                        {Array.isArray(r.gap_to_leader)
                          ? ""
                          : formatGap(r.gap_to_leader)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <p className={styles.heroSub}>No classification yet.</p>
        )}

        <div className={styles.heroActions}>
          {round.race && (
            <ButtonLink
              to={`/replay/${round.race.session_key}`}
              variant="primary"
              icon={<IconPlayerPlayFilled size={14} aria-hidden="true" />}
            >
              Open replay
            </ButtonLink>
          )}
          <ButtonLink
            to={`/rounds/${round.meeting.meeting_key}`}
            variant="secondary"
            icon={<IconListDetails size={15} stroke={1.5} aria-hidden="true" />}
          >
            Race details
          </ButtonLink>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <CircuitMap
          outline={circuit?.outline}
          name={circuit?.name ?? round.meeting.circuit_short_name}
          className={styles.heroMap}
        />
        <dl className={styles.facts}>
          <div>
            <dt>Laps</dt>
            <dd>{winner?.number_of_laps ?? "—"}</dd>
          </div>
          <div>
            <dt>Classified</dt>
            <dd>{rows.length ? `${classified}/${rows.length}` : "—"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

/** Next round: a large day countdown beside the circuit. */
function NextRound({ round }: { round: RoundInfo }) {
  const circuits = useCircuitsByKey();
  const circuit = circuits.byKey.get(round.meeting.circuit_key);
  const live = round.status === "in-progress";
  // Read the clock once per mount: a day countdown does not need to tick.
  const [now] = useState(Date.now);
  const days = Math.max(
    0,
    Math.ceil(
      (new Date(round.meeting.date_start).getTime() - now) / 86_400_000,
    ),
  );

  return (
    <Link to={`/rounds/${round.meeting.meeting_key}`} className={styles.next}>
      <div className={styles.nextText}>
        <p className={styles.eyebrow}>
          {live ? "This weekend" : `Next · Round ${round.round}`}
        </p>
        <p className={styles.nextName}>
          {round.meeting.country_flag && (
            <img
              src={round.meeting.country_flag}
              alt=""
              className={styles.flag}
            />
          )}
          {round.meeting.meeting_name}
        </p>
        <p className={styles.heroSub}>
          {formatDateRange(round.meeting.date_start, round.meeting.date_end)}
          {round.sprint ? " · Sprint" : ""}
        </p>
        {live ? (
          <span className={styles.live}>
            <span className={styles.liveDot} aria-hidden="true" />
            Live now
          </span>
        ) : (
          <p className={styles.countdown}>
            <span className={styles.countdownValue}>
              {String(days).padStart(2, "0")}
            </span>
            {days === 1 ? "day to go" : "days to go"}
          </p>
        )}
      </div>
      <CircuitMap
        outline={circuit?.outline}
        name={circuit?.name ?? round.meeting.circuit_short_name}
        className={styles.nextMap}
      />
    </Link>
  );
}

function SeasonComplete({ year }: { year: number }) {
  return (
    <div className={styles.next}>
      <div className={styles.nextText}>
        <p className={styles.eyebrow}>Season complete</p>
        <p className={styles.nextName}>The {year} season is over</p>
        <Link to="/calendar" className={styles.link}>
          Browse the calendar{" "}
          <IconArrowRight size={14} stroke={1.5} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/** One segment per Grand Prix, then three season figures. */
function SeasonProgress({
  season,
  rounds,
}: {
  season: SeasonModel;
  rounds: RoundInfo[];
}) {
  const completed = rounds.filter((r) => r.status === "completed").length;
  const [leader, second] = season.driverStandings;
  const winners = new Set(
    [...season.results]
      .filter(([, rs]) => rs.some((r) => r.finish === 1))
      .map(([n]) => n),
  ).size;

  return (
    <Card
      title="Season progress"
      description={`${completed} of ${rounds.length} Grands Prix`}
      className={styles.progressCard}
    >
      <ol className={styles.segments} aria-label="Rounds">
        {rounds.map((r) => (
          <li
            key={r.meeting.meeting_key}
            className={styles.segment}
            data-status={r.status}
            title={`R${r.round} ${r.meeting.meeting_name}`}
          />
        ))}
      </ol>
      <dl className={styles.facts}>
        <div>
          <dt>Complete</dt>
          <dd>
            {rounds.length ? Math.round((completed / rounds.length) * 100) : 0}%
          </dd>
        </div>
        <div>
          <dt>Winners</dt>
          <dd>{winners}</dd>
        </div>
        <div>
          <dt>Lead</dt>
          <dd>
            {leader && second
              ? `+${formatPoints(leader.points - second.points)}`
              : "—"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

const fullStandings = (
  <Link to="/standings" className={styles.link}>
    Full standings <IconArrowRight size={14} stroke={1.5} aria-hidden="true" />
  </Link>
);

interface RankingRowProps {
  to: string;
  color: string;
  index: number;
  position: number | null;
  /** Portrait or team marker. */
  visual: ReactNode;
  name: string;
  sub?: string;
  move?: ReactNode;
  points: number;
  leaderPoints: number;
}

/** A championship row: position, visual, name, optional move, points, and a team-colour bar against the leader. */
function RankingRow({
  to,
  color,
  index,
  position,
  visual,
  name,
  sub,
  move,
  points,
  leaderPoints,
}: RankingRowProps) {
  return (
    <li>
      <Link
        to={to}
        className={styles.rankRow}
        style={{ "--team": color, "--i": index } as CSSProperties}
      >
        <span className={styles.rankPos}>
          {String(position ?? "—").padStart(2, "0")}
        </span>
        {visual}
        <span className={styles.rankName}>
          {name}
          {sub && <span>{sub}</span>}
        </span>
        <span className={styles.rankMove}>{move}</span>
        <span className={styles.rankPoints}>{formatPoints(points)}</span>
        <span className={styles.rankBar} aria-hidden="true">
          <span
            style={{
              width: `${leaderPoints ? (points / leaderPoints) * 100 : 0}%`,
            }}
          />
        </span>
      </Link>
    </li>
  );
}

/** Top ten drivers, with the move over the last three races. */
function DriversChampionship({ season }: { season: SeasonModel }) {
  const form = new Map(formTable(season).map((f) => [f.driverNumber, f]));
  const leaderPoints = season.driverStandings[0]?.points ?? 0;
  return (
    <Card title="Drivers' championship" actions={fullStandings}>
      <ol className={styles.ranking}>
        {season.driverStandings.slice(0, 10).map((s, i) => {
          const driver = season.drivers.get(s.driverNumber);
          const name = driver?.fullName ?? `#${s.driverNumber}`;
          const move = form.get(s.driverNumber)?.positionChange;
          return (
            <RankingRow
              key={s.driverNumber}
              to={`/drivers/${season.year}/${s.driverNumber}`}
              color={driver?.color ?? UNKNOWN_TEAM_COLOR}
              index={i}
              position={s.position}
              visual={
                <Avatar src={driver?.headshotUrl} name={name} size="sm" />
              }
              name={name}
              sub={driver?.teamName}
              move={
                move != null ? (
                  <PositionChange
                    from={(s.position ?? 0) + move}
                    to={s.position}
                  />
                ) : null
              }
              points={s.points}
              leaderPoints={leaderPoints}
            />
          );
        })}
      </ol>
    </Card>
  );
}

function ConstructorsChampionship({ season }: { season: SeasonModel }) {
  const leaderPoints = season.teamStandings[0]?.points ?? 0;
  return (
    <Card title="Constructors" actions={fullStandings}>
      <ol className={styles.ranking}>
        {season.teamStandings.map((t, i) => {
          const team = season.teams.get(t.teamName);
          const color = team?.color ?? UNKNOWN_TEAM_COLOR;
          return (
            <RankingRow
              key={t.teamName}
              to={`/constructors/${season.year}/${team?.slug ?? ""}`}
              color={color}
              index={i}
              position={t.position}
              visual={<TeamMarker color={color} />}
              name={t.teamName}
              points={t.points}
              leaderPoints={leaderPoints}
            />
          );
        })}
      </ol>
    </Card>
  );
}

/** Insights as a row of small cards; the basis of each sits under it. */
function Insights({ season }: { season: SeasonModel }) {
  const insights = seasonInsights(season);
  if (insights.length === 0) return null;
  return (
    <section
      className={styles.insightsSection}
      aria-labelledby="insights-title"
    >
      <h2 id="insights-title" className={styles.sectionTitle}>
        RaceGrid insights
      </h2>
      <ul className={`${styles.insights} rg-stagger`}>
        {insights.map((insight) => {
          const body = (
            <>
              <IconBulb
                className={styles.insightIcon}
                size={16}
                stroke={1.5}
                aria-hidden="true"
              />
              <span className={styles.insightText}>{insight.text}</span>
              <span className={styles.basis}>{insight.basis}</span>
            </>
          );
          return (
            <li key={insight.id}>
              {insight.to ? (
                <Link to={insight.to} className={styles.insight}>
                  {body}
                </Link>
              ) : (
                <div className={styles.insight}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
