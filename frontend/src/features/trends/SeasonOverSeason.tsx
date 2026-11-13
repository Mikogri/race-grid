import { useState } from "react";
import { teamQualifyingGaps } from "../../analytics/performance";
import { SEASONS } from "../../app/seasons";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/StateViews";
import table from "../../components/ui/Table.module.css";
import { TeamMarker } from "../../components/ui/TeamMarker";
import { useSeason } from "../../data/season";
import { formatPoints } from "../../lib/format";
import { median } from "../../lib/stats";
import { UNKNOWN_TEAM_COLOR } from "../../lib/teams";
import styles from "./TrendsPage.module.css";

/** Season-level team figures for every OpenF1 season. Loaded on request (about 7 requests per season). */
export function SeasonOverSeason({ currentYear }: { currentYear: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Card
      title="Season over season"
      info="Team names as reported for each season, so renamed teams appear separately. Seasons in progress show standings after the latest race."
      flush
      actions={
        !open && (
          <Button variant="ghost" onClick={() => setOpen(true)}>
            Load all seasons
          </Button>
        )
      }
    >
      {open ? (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Season</th>
                <th>Team</th>
                <th className={table.right}>Champ.</th>
                <th className={table.right}>Points</th>
                <th
                  className={table.right}
                  title="Median over rounds of the team's qualifying gap to the fastest lap"
                >
                  Quali gap
                </th>
              </tr>
            </thead>
            {SEASONS.map((year) => (
              <SeasonRows
                key={year}
                year={year}
                highlight={year === currentYear}
              />
            ))}
          </table>
        </div>
      ) : null}
    </Card>
  );
}

function SeasonRows({ year, highlight }: { year: number; highlight: boolean }) {
  const { season, error, refetch } = useSeason(year);
  if (error) {
    return (
      <tbody>
        <tr>
          <td colSpan={5}>
            <ErrorState error={error} onRetry={refetch} />
          </td>
        </tr>
      </tbody>
    );
  }
  if (!season) {
    return (
      <tbody>
        <tr>
          <td className={table.strong}>{year}</td>
          <td colSpan={4} className={table.muted}>
            Loading…
          </td>
        </tr>
      </tbody>
    );
  }
  return (
    <tbody>
      {season.teamStandings.map((row, i) => {
        const team = season.teams.get(row.teamName);
        const gap = median(
          teamQualifyingGaps(season, row.teamName).map((g) => g.gap),
        );
        return (
          <tr key={row.teamName}>
            <td
              className={
                i === 0 ? `${table.strong} ${highlight ? "" : table.muted}` : ""
              }
            >
              {i === 0 ? year : ""}
            </td>
            <td>
              <span className={styles.teamCell}>
                <TeamMarker color={team?.color ?? UNKNOWN_TEAM_COLOR} />
                {row.teamName}
              </span>
            </td>
            <td className={table.right}>P{row.position ?? "—"}</td>
            <td className={`${table.right} ${table.strong}`}>
              {formatPoints(row.points)}
            </td>
            <td className={table.right}>
              {gap === null ? "—" : `${gap.toFixed(2)}%`}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}
