import { Link } from "react-router";
import { labelFor, type DriverLookup } from "../../analytics/drivers";
import type { Session, SessionResult } from "../../api/openf1/types";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from "../../components/ui/StateViews";
import table from "../../components/ui/Table.module.css";
import { DriverTag } from "../../components/ui/TeamMarker";
import { useSessionData } from "../../data/sessionData";
import {
  formatDuration,
  formatGap,
  formatLapTime,
  formatPoints,
} from "../../lib/format";

function statusBadge(r: SessionResult) {
  if (r.dsq) return <Badge tone="danger">DSQ</Badge>;
  if (r.dns) return <Badge>DNS</Badge>;
  if (r.dnf) return <Badge>DNF</Badge>;
  return null;
}

const phase = (value: SessionResult["duration"], index: number) =>
  Array.isArray(value) ? (value[index] ?? null) : null;

export function SessionResultsTab({
  session,
  lookup,
}: {
  session: Session;
  lookup: DriverLookup;
}) {
  const results = useSessionData("session_result", session);
  const isQualifying = session.session_type === "Qualifying";
  const isRace = session.session_type === "Race";

  return (
    <Card title={`${session.session_name} classification`} flush>
      {results.error ? (
        <ErrorState
          error={results.error}
          onRetry={() => void results.refetch()}
        />
      ) : results.isPending ? (
        <Skeleton rows={12} />
      ) : !results.data?.length ? (
        <EmptyState title="No classification published for this session" />
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.right}>Pos</th>
                <th>Driver</th>
                <th className={table.optional}>Team</th>
                {isQualifying ? (
                  <>
                    <th className={`${table.right} ${table.optionalNarrow}`}>
                      Q1
                    </th>
                    <th className={`${table.right} ${table.optionalNarrow}`}>
                      Q2
                    </th>
                    <th className={table.right}>Q3</th>
                  </>
                ) : (
                  <>
                    <th
                      className={`${table.right} ${isRace ? table.optionalNarrow : ""}`}
                    >
                      {isRace ? "Time" : "Best lap"}
                    </th>
                    <th className={table.right}>Gap</th>
                  </>
                )}
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  Laps
                </th>
                {isRace && <th className={table.right}>Points</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {[...results.data]
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                .map((r) => {
                  const driver = labelFor(lookup, r.driver_number);
                  return (
                    <tr key={r.driver_number}>
                      <td className={table.right}>{r.position ?? "—"}</td>
                      <td>
                        <Link
                          to={`/drivers/${session.year}/${r.driver_number}`}
                          className={table.link}
                        >
                          <DriverTag
                            acronym={driver.acronym}
                            color={driver.color}
                            name={driver.name}
                          />
                        </Link>
                      </td>
                      <td className={table.optional}>{driver.teamName}</td>
                      {isQualifying ? (
                        [0, 1, 2].map((i) => (
                          <td
                            key={i}
                            className={`${table.right} ${table.time} ${i < 2 ? table.optionalNarrow : ""}`}
                          >
                            {formatLapTime(phase(r.duration, i))}
                          </td>
                        ))
                      ) : (
                        <>
                          <td
                            className={`${table.right} ${table.time} ${isRace ? table.optionalNarrow : ""}`}
                          >
                            {typeof r.duration === "number"
                              ? isRace
                                ? formatDuration(r.duration)
                                : formatLapTime(r.duration)
                              : "—"}
                          </td>
                          <td
                            className={`${table.right} ${table.time} ${table.muted}`}
                          >
                            {r.position === 1
                              ? "—"
                              : Array.isArray(r.gap_to_leader)
                                ? "—"
                                : formatGap(r.gap_to_leader)}
                          </td>
                        </>
                      )}
                      <td className={`${table.right} ${table.optionalNarrow}`}>
                        {r.number_of_laps ?? "—"}
                      </td>
                      {isRace && (
                        <td className={`${table.right} ${table.strong}`}>
                          {formatPoints(r.points)}
                        </td>
                      )}
                      <td>{statusBadge(r)}</td>
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
