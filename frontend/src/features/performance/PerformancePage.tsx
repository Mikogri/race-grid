import { useState } from "react";
import { Link } from "react-router";
import {
  COMPONENT_LABEL,
  FORMULA,
  WEIGHTS,
  teamPerformance,
  type ComponentKey,
  type TeamPerformance,
} from "../../analytics/performance";
import { useSelectedSeason } from "../../app/seasons";
import layout from "../../components/layout/PageLayout.module.css";
import { Badge } from "../../components/ui/Badge";
import { Card, DetailPanel, Panel } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { InfoTip } from "../../components/ui/Tooltip";
import { EmptyState, ErrorState } from "../../components/ui/StateViews";
import { PageSkeleton } from "../../components/ui/PageSkeleton";
import table from "../../components/ui/Table.module.css";
import { TeamMarker } from "../../components/ui/TeamMarker";
import { useRacePace } from "../../data/seasonPace";
import { useSeason } from "../../data/season";
import { capitalize } from "../../lib/format";
import { AnalysisBanner } from "../../components/AnalysisBanner";
import { TeamBreakdown } from "./TeamBreakdown";
import styles from "./PerformancePage.module.css";

const KEYS = Object.keys(WEIGHTS) as ComponentKey[];
/** Hidden first when the table's panel is narrow; the index and its main drivers stay. */
const SECONDARY = new Set<ComponentKey>([
  "consistency",
  "twoCar",
  "reliability",
]);
/** Also hidden on the narrowest panels (phones). */
const TERTIARY = new Set<ComponentKey>(["qualifying", "racePace"]);

export function PerformancePage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);
  const racePace = useRacePace(season?.completedRounds ?? [], Boolean(season));
  const [selected, setSelected] = useState<string | null>(null);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending || !season) return <PageSkeleton layout="table" header />;

  const teams = teamPerformance(
    season,
    racePace.pace.size ? racePace.pace : null,
  );
  const current: TeamPerformance | undefined =
    teams.find((t) => t.teamName === selected) ?? teams[0];

  return (
    <>
      <PageHeader
        title={`${year} Team Performance`}
        meta={[
          { label: "Rounds analysed", value: season.completedRounds.length },
          {
            label: "Race pace data",
            value: `${racePace.progress.done} / ${racePace.progress.total} races`,
          },
          {
            label: "Top index",
            value:
              teams[0]?.index != null
                ? `${teams[0].teamName} · ${teams[0].index.toFixed(1)}`
                : "—",
          },
        ]}
      />
      {!racePace.complete && !racePace.error && (
        <AnalysisBanner progress={racePace.progress} />
      )}
      {racePace.error ? (
        <ErrorState
          title="Race pace could not be computed"
          error={racePace.error}
        />
      ) : null}
      {teams.length === 0 ? (
        <EmptyState title="No completed rounds yet" />
      ) : (
        <div className={layout.withPanel}>
          <Panel>
            <Card
              title="RaceGrid Team Performance Index"
              info="Scores 0–100. * provisional: a component is missing (usually race pace still loading) and the remaining weights are renormalised."
              flush
            >
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th className={table.right}>#</th>
                      <th>Team</th>
                      <th className={table.right}>Index</th>
                      {KEYS.map((k) => (
                        <th
                          key={k}
                          className={`${table.right} ${SECONDARY.has(k) ? table.optional : ""} ${TERTIARY.has(k) ? table.optionalNarrow : ""}`}
                          title={FORMULA[k]}
                        >
                          {COMPONENT_LABEL[k]
                            .replace(" pace", "")
                            .replace("Two-car strength", "2-car")}
                        </th>
                      ))}
                      <th className={table.optionalNarrow}>Dependency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, i) => (
                      <tr
                        key={team.teamName}
                        className={`${table.clickable} ${current?.teamName === team.teamName ? table.selected : ""}`}
                        onClick={() => setSelected(team.teamName)}
                        aria-selected={current?.teamName === team.teamName}
                      >
                        <td className={`${table.right} ${table.muted}`}>
                          {i + 1}
                        </td>
                        <td>
                          <span className={styles.team}>
                            <TeamMarker color={team.color} />
                            <Link
                              to={`/constructors/${year}/${team.slug}`}
                              className={`${table.primary} ${table.link}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {team.teamName}
                            </Link>
                          </span>
                        </td>
                        <td className={`${table.right} ${table.strong}`}>
                          {team.index?.toFixed(1) ?? "—"}
                          {team.provisional && (
                            <span
                              className={styles.provisional}
                              title="Some components are missing; weights renormalised"
                            >
                              *
                            </span>
                          )}
                        </td>
                        {KEYS.map((k) => (
                          <td
                            key={k}
                            className={`${table.right} ${SECONDARY.has(k) ? table.optional : ""} ${TERTIARY.has(k) ? table.optionalNarrow : ""}`}
                          >
                            {team.components[k].score?.toFixed(0) ?? "—"}
                          </td>
                        ))}
                        <td className={table.optionalNarrow}>
                          {team.dependency.level ? (
                            <Badge
                              tone={
                                team.dependency.level === "HIGH"
                                  ? "danger"
                                  : team.dependency.level === "MEDIUM"
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {capitalize(team.dependency.level.toLowerCase())}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card
              title="Method"
              info="The index describes what the whole package (team, car and drivers) achieved in OpenF1 data. It cannot separate car from driver, set-up or strategy, and it is a RaceGrid metric, not an official F1 figure. Clean race laps exclude lap 1, pit in/out laps and laps slower than 107% of the driver's median."
            >
              <ul className={styles.method}>
                {KEYS.map((k) => (
                  <li key={k}>
                    <span className={styles.methodName}>
                      {COMPONENT_LABEL[k]}
                    </span>
                    <span className={styles.weight}>
                      {Math.round(WEIGHTS[k] * 100)}%
                    </span>
                    <InfoTip content={FORMULA[k]} size={13} />
                  </li>
                ))}
                <li>
                  <span className={styles.methodName}>Driver dependency</span>
                  <span className={styles.weight}>—</span>
                  <InfoTip
                    content="Share of team points scored by its top scorer: ≥ 75% HIGH, 60–75% MEDIUM, below 60% LOW."
                    size={13}
                  />
                </li>
              </ul>
            </Card>
          </Panel>
          <DetailPanel className={layout.panel}>
            {current && <TeamBreakdown team={current} season={season} />}
          </DetailPanel>
        </div>
      )}
    </>
  );
}
