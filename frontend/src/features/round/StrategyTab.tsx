import { labelFor, type DriverLookup } from "../../analytics/drivers";
import {
  indexPositions,
  pitBattles,
  pitLosses,
  stintPace,
} from "../../analytics/strategy";
import type { Session } from "../../api/openf1/types";
import { StintChart } from "../../components/StintChart";
import layout from "../../components/layout/PageLayout.module.css";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from "../../components/ui/StateViews";
import table from "../../components/ui/Table.module.css";
import { DriverTag } from "../../components/ui/TeamMarker";
import { TyreBadge } from "../../components/ui/TyreBadge";
import { useSessionData } from "../../data/sessionData";
import { capitalize, formatDelta, formatLapTime } from "../../lib/format";

export function StrategyTab({
  session,
  lookup,
}: {
  session: Session;
  lookup: DriverLookup;
}) {
  const stints = useSessionData("stints", session);
  const pits = useSessionData("pit", session);
  const laps = useSessionData("laps", session);
  const positions = useSessionData("position", session);
  const results = useSessionData("session_result", session);
  const queries = [stints, pits, laps, positions, results];
  const error = queries.find((q) => q.error)?.error;

  if (error) return <ErrorState error={error} />;
  if (queries.some((q) => q.isPending)) return <Skeleton rows={14} />;
  if (!stints.data?.length)
    return <EmptyState title="No stint data for this session" />;

  const order = [...(results.data ?? [])]
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((r) => r.driver_number);
  const driverNumbers = order.length
    ? order
    : [...new Set(stints.data.map((s) => s.driver_number))];
  const totalLaps = Math.max(
    1,
    ...(laps.data ?? []).map((l) => l.lap_number),
    ...stints.data.map((s) => s.lap_end ?? 0),
  );
  const positionIndex = indexPositions(positions.data ?? []);
  const losses = pitLosses(
    laps.data ?? [],
    pits.data ?? [],
    positionIndex,
  ).sort((a, b) => a.pit.lap_number - b.pit.lap_number);
  const battles = pitBattles(
    laps.data ?? [],
    pits.data ?? [],
    positionIndex,
  ).filter((b) => b.outcome !== "held");
  const paces = stintPace(laps.data ?? [], stints.data, pits.data ?? []).filter(
    (p) => p.cleanLaps >= 3,
  );

  return (
    <div className={layout.stack}>
      <Card title="Tyre stints">
        <StintChart
          drivers={driverNumbers.map((n) => labelFor(lookup, n))}
          stints={stints.data}
          pits={pits.data ?? []}
          totalLaps={totalLaps}
        />
      </Card>
      <div className={layout.twoCol}>
        <Card title="Pit stops" flush>
          {losses.length === 0 ? (
            <EmptyState title="No pit stops recorded" />
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th className={table.right}>Lap</th>
                    <th className={`${table.right} ${table.optionalNarrow}`}>
                      Pit lane
                    </th>
                    <th className={`${table.right} ${table.optionalNarrow}`}>
                      Stationary
                    </th>
                    <th
                      className={table.right}
                      title="(in-lap + out-lap) − 2 × median clean lap. RaceGrid derived."
                    >
                      Pit loss ≈
                    </th>
                    <th className={table.right}>Pos before → after</th>
                  </tr>
                </thead>
                <tbody>
                  {losses.map(
                    ({ pit, lossSeconds, positionBefore, positionAfter }) => {
                      const driver = labelFor(lookup, pit.driver_number);
                      return (
                        <tr key={`${pit.driver_number}-${pit.lap_number}`}>
                          <td>
                            <DriverTag
                              acronym={driver.acronym}
                              color={driver.color}
                            />
                          </td>
                          <td className={table.right}>{pit.lap_number}</td>
                          <td
                            className={`${table.right} ${table.optionalNarrow}`}
                          >
                            {pit.lane_duration != null
                              ? `${pit.lane_duration.toFixed(1)} s`
                              : "—"}
                          </td>
                          <td
                            className={`${table.right} ${table.optionalNarrow}`}
                          >
                            {pit.stop_duration != null
                              ? `${pit.stop_duration.toFixed(1)} s`
                              : "—"}
                          </td>
                          <td className={table.right}>
                            {lossSeconds != null
                              ? `${lossSeconds.toFixed(1)} s`
                              : "—"}
                          </td>
                          <td className={table.right}>
                            {positionBefore ?? "—"} → {positionAfter ?? "—"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Undercut / overcut" flush>
          {battles.length === 0 ? (
            <EmptyState title="No position swaps through pit cycles detected">
              Checked pairs of adjacent cars where both stopped within 5 laps of
              each other.
            </EmptyState>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th>Pitted first</th>
                    <th>Pitted later</th>
                    <th className={`${table.right} ${table.optionalNarrow}`}>
                      Laps
                    </th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {battles.map((b) => {
                    const early = labelFor(lookup, b.early);
                    const late = labelFor(lookup, b.late);
                    return (
                      <tr key={`${b.early}-${b.late}-${b.earlyLap}`}>
                        <td>
                          <DriverTag
                            acronym={early.acronym}
                            color={early.color}
                          />
                        </td>
                        <td>
                          <DriverTag
                            acronym={late.acronym}
                            color={late.color}
                          />
                        </td>
                        <td
                          className={`${table.right} ${table.optionalNarrow}`}
                        >
                          {b.earlyLap} / {b.lateLap}
                        </td>
                        <td>
                          <Badge
                            tone={b.outcome === "undercut" ? "success" : "info"}
                          >
                            {capitalize(b.outcome)}
                          </Badge>{" "}
                          <span className={table.muted}>
                            {b.outcome === "undercut"
                              ? `${early.acronym} jumped ${late.acronym}`
                              : `${late.acronym} kept ahead / jumped ${early.acronym}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <Card title="Stint pace" flush>
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Driver</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  Stint
                </th>
                <th>Tyre</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  Laps
                </th>
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  Clean laps
                </th>
                <th className={table.right}>Median lap</th>
                <th
                  className={table.right}
                  title="Least-squares slope of clean lap time vs tyre age. Includes fuel burn effect."
                >
                  Lap-time trend
                </th>
              </tr>
            </thead>
            <tbody>
              {paces.map((p) => {
                const driver = labelFor(lookup, p.driverNumber);
                return (
                  <tr key={`${p.driverNumber}-${p.stintNumber}`}>
                    <td>
                      <DriverTag
                        acronym={driver.acronym}
                        color={driver.color}
                      />
                    </td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {p.stintNumber}
                    </td>
                    <td>
                      <TyreBadge compound={p.compound} />
                    </td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {p.lapStart}–{p.lapEnd}
                    </td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {p.cleanLaps}
                    </td>
                    <td className={`${table.right} ${table.time}`}>
                      {formatLapTime(p.medianLap)}
                    </td>
                    <td className={`${table.right} ${table.time}`}>
                      {p.trendPerLap != null
                        ? `${formatDelta(p.trendPerLap)} s/lap`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
