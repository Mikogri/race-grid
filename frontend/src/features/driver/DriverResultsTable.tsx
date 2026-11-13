import { Link } from "react-router";
import type { DriverRoundResult, SeasonModel } from "../../analytics/season";
import { FinishCell } from "../../components/FinishCell";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/StateViews";
import table from "../../components/ui/Table.module.css";
import { formatPoints } from "../../lib/format";

export function DriverResultsTable({
  season,
  results,
}: {
  season: SeasonModel;
  results: DriverRoundResult[];
}) {
  const roundByNumber = new Map(season.rounds.map((r) => [r.round, r]));
  return (
    <Card title="Results by round" flush>
      {results.length === 0 ? (
        <EmptyState title="No race results yet this season" />
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.right}>Rd</th>
                <th>Grand Prix</th>
                <th className={table.optional}>Team</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  Quali
                </th>
                <th className={table.right}>Grid</th>
                <th className={table.right}>Finish</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  +/−
                </th>
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  Sprint
                </th>
                <th className={table.right}>Points</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const round = roundByNumber.get(r.round);
                const gained =
                  r.grid !== null && r.finish !== null
                    ? r.grid - r.finish
                    : null;
                return (
                  <tr key={r.round}>
                    <td className={`${table.right} ${table.muted}`}>
                      {r.round}
                    </td>
                    <td>
                      <Link
                        to={`/rounds/${r.meetingKey}`}
                        className={`${table.primary} ${table.link}`}
                      >
                        {round?.meeting.meeting_name ?? `Round ${r.round}`}
                      </Link>
                    </td>
                    <td className={table.optional}>{r.teamName}</td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {r.qualifyingPosition ?? "—"}
                    </td>
                    <td className={table.right}>{r.grid ?? "—"}</td>
                    <td className={table.right}>
                      <FinishCell position={r.finish} status={r.status} />
                    </td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {gained === null
                        ? "—"
                        : gained > 0
                          ? `+${gained}`
                          : gained}
                    </td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {r.sprintFinish ?? "—"}
                    </td>
                    <td className={`${table.right} ${table.strong}`}>
                      {formatPoints(r.points + r.sprintPoints)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
