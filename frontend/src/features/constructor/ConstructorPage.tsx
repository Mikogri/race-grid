import { Link, useParams } from "react-router";
import { IconArrowRight } from "@tabler/icons-react";
import { teamDriverNumbers } from "../../analytics/driverStats";
import type { DriverRoundResult } from "../../analytics/season";
import { LineChart } from "../../components/charts/LineChart";
import { FinishCell } from "../../components/FinishCell";
import layout from "../../components/layout/PageLayout.module.css";
import { ButtonLink } from "../../components/ui/Button";
import { Card, Panel } from "../../components/ui/Card";
import { DetailList } from "../../components/ui/DetailList";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, ErrorState } from "../../components/ui/StateViews";
import { PageSkeleton } from "../../components/ui/PageSkeleton";
import table from "../../components/ui/Table.module.css";
import { DriverTag, TeamMarker } from "../../components/ui/TeamMarker";
import { useSeason } from "../../data/season";
import { formatPercent, formatPoints } from "../../lib/format";
import styles from "./ConstructorPage.module.css";

export function ConstructorPage() {
  const params = useParams();
  const year = Number(params.year);
  const { season, isPending, error, refetch } = useSeason(year);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending || !season) return <PageSkeleton layout="detail" header />;

  const team = [...season.teams.values()].find(
    (t) => t.slug === params.teamSlug,
  );
  if (!team)
    return (
      <EmptyState title="Unknown constructor">
        No team with this name raced in {year} according to OpenF1.
      </EmptyState>
    );

  const standing = season.teamStandings.find((s) => s.teamName === team.name);
  const driverNumbers = teamDriverNumbers(season, team.name);
  const entries = driverNumbers.map((number) => ({
    number,
    info: season.drivers.get(number),
    results: (season.results.get(number) ?? []).filter(
      (r) => r.teamName === team.name,
    ),
  }));
  const allResults = entries.flatMap((e) => e.results);
  const teamPoints = allResults.reduce(
    (sum, r) => sum + r.points + r.sprintPoints,
    0,
  );
  const starts = allResults.filter((r) => r.status !== "dns").length;
  const classified = allResults.filter((r) => r.status === "finished").length;
  const rounds = season.completedRounds.filter((round) =>
    allResults.some((r) => r.round === round.round),
  );
  const resultFor = (
    number: number,
    round: number,
  ): DriverRoundResult | undefined =>
    entries
      .find((e) => e.number === number)
      ?.results.find((r) => r.round === round);

  const history = season.standingsHistory
    .filter((h) => h.session.session_name === "Race")
    .map((h) => ({
      round: h.round ?? 0,
      row: h.teams.find((t) => t.team_name === team.name),
    }))
    .filter((h) => h.row && h.round);

  return (
    <>
      <PageHeader
        crumbs={[{ to: "/standings", label: "Standings" }]}
        leading={<TeamMarker color={team.color} size="lg" />}
        title={team.name}
        meta={[
          {
            label: "Championship",
            value: standing?.position ? `P${standing.position}` : "—",
          },
          { label: "Points", value: formatPoints(standing?.points) },
          {
            label: "Wins",
            value: allResults.filter((r) => r.finish === 1).length,
          },
          {
            label: "Podiums",
            value: allResults.filter((r) => r.finish !== null && r.finish <= 3)
              .length,
          },
          {
            label: "Classified",
            value: starts ? `${classified}/${starts}` : "—",
          },
        ]}
        actions={
          <ButtonLink
            to="/performance"
            variant="ghost"
            icon={<IconArrowRight size={14} stroke={1.5} aria-hidden="true" />}
          >
            Team performance
          </ButtonLink>
        }
      />
      <div className={`${layout.twoCol} ${styles.summary}`}>
        <Card title="Driver contribution">
          <ul className={styles.contribution}>
            {entries.map((e) => {
              const points = e.results.reduce(
                (sum, r) => sum + r.points + r.sprintPoints,
                0,
              );
              const share = teamPoints > 0 ? (points / teamPoints) * 100 : 0;
              return (
                <li key={e.number}>
                  <div className={styles.contributionHead}>
                    <Link
                      to={`/drivers/${year}/${e.number}`}
                      className={table.link}
                    >
                      <DriverTag
                        acronym={e.info?.acronym ?? `#${e.number}`}
                        color={team.color}
                        name={e.info?.lastName}
                      />
                    </Link>
                    <span className="tabular">
                      {formatPoints(points)} pts · {formatPercent(share, 0)}
                    </span>
                  </div>
                  <div className={styles.bar}>
                    <div style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card
          title="Reliability"
          info="DNFs include accidents as well as failures: the cause of a retirement is not published."
        >
          <DetailList
            items={[
              { label: "Car starts", value: starts },
              { label: "Classified finishes", value: classified },
              {
                label: "DNF",
                value: allResults.filter((r) => r.status === "dnf").length,
              },
              {
                label: "DNS / DSQ",
                value: `${allResults.filter((r) => r.status === "dns").length} / ${allResults.filter((r) => r.status === "dsq").length}`,
              },
              {
                label: "Finish rate",
                value: starts
                  ? formatPercent((classified / starts) * 100, 0)
                  : "—",
              },
            ]}
          />
        </Card>
      </div>
      <Panel>
        <Card title="Results by round" flush>
          {rounds.length === 0 ? (
            <EmptyState title="No race results yet" />
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={`${table.right} ${table.optionalNarrow}`}>
                      Rd
                    </th>
                    <th>Grand Prix</th>
                    {entries.map((e) => (
                      <th key={e.number} className={table.right}>
                        {e.info?.acronym ?? `#${e.number}`}
                      </th>
                    ))}
                    <th className={table.right}>Team points</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round) => {
                    const points = entries.reduce((sum, e) => {
                      const r = resultFor(e.number, round.round ?? 0);
                      return sum + (r ? r.points + r.sprintPoints : 0);
                    }, 0);
                    return (
                      <tr key={round.meeting.meeting_key}>
                        <td
                          className={`${table.right} ${table.muted} ${table.optionalNarrow}`}
                        >
                          {round.round}
                        </td>
                        <td>
                          <Link
                            to={`/rounds/${round.meeting.meeting_key}`}
                            className={`${table.primary} ${table.link}`}
                          >
                            {round.meeting.meeting_name}
                          </Link>
                        </td>
                        {entries.map((e) => {
                          const r = resultFor(e.number, round.round ?? 0);
                          return (
                            <td key={e.number} className={table.right}>
                              {r ? (
                                <FinishCell
                                  position={r.finish}
                                  status={r.status}
                                />
                              ) : (
                                <span className={table.muted}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className={`${table.right} ${table.strong}`}>
                          {formatPoints(points)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Championship position after each race">
          {history.length === 0 ? (
            <EmptyState title="No championship history yet" />
          ) : (
            <LineChart
              label={`${team.name} championship position by round`}
              series={[
                {
                  id: "pos",
                  label: "Position",
                  color: team.color,
                  points: history.map((h) => ({
                    x: h.round,
                    y: h.row?.position_current ?? 0,
                  })),
                },
              ]}
              yReversed
              yDomain={[1, Math.max(10, season.teamStandings.length)]}
              yTicks={[1, 3, 5, 7, 10]}
              formatX={(x) => `R${x}`}
              formatY={(y) => `P${Math.round(y)}`}
            />
          )}
        </Card>
      </Panel>
    </>
  );
}
