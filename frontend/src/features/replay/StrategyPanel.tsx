import { useMemo } from "react";
import { labelFor } from "../../analytics/drivers";
import {
  raceLapAt,
  timingAt,
  type ReplayModel,
} from "../../analytics/replay/model";
import {
  indexPositions,
  pitBattles,
  pitLosses,
  stintPace,
} from "../../analytics/strategy";
import { StintChart } from "../../components/StintChart";
import { Badge } from "../../components/ui/Badge";
import { SectionLabel } from "../../components/ui/DetailList";
import table from "../../components/ui/Table.module.css";
import { TyreBadge } from "../../components/ui/TyreBadge";
import { capitalize, formatDelta, formatLapTime } from "../../lib/format";
import { toMs } from "../../lib/stats";
import { useClock, type ReplayClock } from "./clock";
import styles from "./ReplayPage.module.css";

export function StrategyPanel({
  clock,
  model,
  driverNumber,
  onSelectDriver,
}: {
  clock: ReplayClock;
  model: ReplayModel;
  driverNumber: number;
  onSelectDriver: (n: number) => void;
}) {
  const { time } = useClock(clock, 2);
  const lap = raceLapAt(model, time);
  const order = timingAt(model, time).map((r) => r.driver);
  const positionIndex = useMemo(
    () => indexPositions(model.raw.positions),
    [model],
  );
  const allLosses = useMemo(
    () => pitLosses(model.raw.laps, model.pits, positionIndex),
    [model, positionIndex],
  );
  const allBattles = useMemo(
    () => pitBattles(model.raw.laps, model.pits, positionIndex),
    [model, positionIndex],
  );

  // Only what has happened by the playhead — no spoilers.
  const driver = labelFor(model.lookup, driverNumber);
  const losses = allLosses.filter(
    (l) => l.pit.driver_number === driverNumber && toMs(l.pit.date) <= time,
  );
  const battles = allBattles.filter(
    (b) => b.lateLap + 2 <= lap && b.outcome !== "held",
  );
  const pastLaps = model.raw.laps.filter(
    (l) => l.driver_number === driverNumber && l.lap_number < lap,
  );
  const paces = stintPace(
    pastLaps,
    model.stints.filter(
      (s) => s.driver_number === driverNumber && (s.lap_start ?? 0) < lap,
    ),
    model.pits,
  );
  const periods = model.periods.filter((p) => p.startMs <= time);

  return (
    <div className={styles.strategy}>
      <StintChart
        drivers={order}
        stints={model.stints}
        pits={model.pits.filter((p) => toMs(p.date) <= time)}
        totalLaps={model.totalLaps}
        currentLap={lap}
        selectedDriver={driverNumber}
        onSelectDriver={onSelectDriver}
      />
      <div className={styles.strategyGrid}>
        <div>
          <SectionLabel>{driver.acronym} pit stops</SectionLabel>
          {losses.length === 0 ? (
            <p className={styles.panelNote}>No stops yet.</p>
          ) : (
            <table className={`${table.table} ${table.live}`}>
              <thead>
                <tr>
                  <th className={table.right}>Lap</th>
                  <th className={table.right}>Lane</th>
                  <th className={table.right}>Stop</th>
                  <th
                    className={table.right}
                    title="(in-lap + out-lap) − 2 × median clean lap (RaceGrid derived)"
                  >
                    Loss ≈
                  </th>
                  <th className={table.right}>Pos</th>
                </tr>
              </thead>
              <tbody>
                {losses.map((l) => (
                  <tr key={l.pit.date}>
                    <td className={table.right}>{l.pit.lap_number}</td>
                    <td className={table.right}>
                      {l.pit.lane_duration != null
                        ? `${l.pit.lane_duration.toFixed(1)} s`
                        : "—"}
                    </td>
                    <td className={table.right}>
                      {l.pit.stop_duration != null
                        ? `${l.pit.stop_duration.toFixed(1)} s`
                        : "—"}
                    </td>
                    <td className={table.right}>
                      {l.lossSeconds != null
                        ? `${l.lossSeconds.toFixed(1)} s`
                        : "—"}
                    </td>
                    <td className={table.right}>
                      {l.positionBefore ?? "—"} → {l.positionAfter ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <SectionLabel>
            {driver.acronym} stint pace (completed laps)
          </SectionLabel>
          {paces.filter((p) => p.cleanLaps > 0).length === 0 ? (
            <p className={styles.panelNote}>Not enough clean laps yet.</p>
          ) : (
            <table className={`${table.table} ${table.live}`}>
              <thead>
                <tr>
                  <th>Tyre</th>
                  <th className={table.right}>Clean laps</th>
                  <th className={table.right}>Median</th>
                  <th
                    className={table.right}
                    title="Slope of clean lap time vs tyre age; includes fuel burn"
                  >
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {paces
                  .filter((p) => p.cleanLaps > 0)
                  .map((p) => (
                    <tr key={p.stintNumber}>
                      <td>
                        <TyreBadge compound={p.compound} />
                      </td>
                      <td className={table.right}>{p.cleanLaps}</td>
                      <td className={`${table.right} ${table.time}`}>
                        {formatLapTime(p.medianLap)}
                      </td>
                      <td className={`${table.right} ${table.time}`}>
                        {p.trendPerLap != null
                          ? `${formatDelta(p.trendPerLap)} s/lap`
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <SectionLabel>Neutralisations so far</SectionLabel>
          {periods.length === 0 ? (
            <p className={styles.panelNote}>No SC, VSC or red flag yet.</p>
          ) : (
            <ul className={styles.plainList}>
              {periods.map((p) => (
                <li key={p.startMs}>
                  <Badge tone={p.kind === "RED" ? "danger" : "warning"}>
                    {p.kind}
                  </Badge>{" "}
                  from lap {p.startLap ?? "?"}
                  {p.endMs && p.endMs <= time
                    ? ` · ${Math.round((p.endMs - p.startMs) / 1000)} s`
                    : " · ongoing"}
                </li>
              ))}
            </ul>
          )}
          <SectionLabel>Undercut / overcut so far</SectionLabel>
          {battles.length === 0 ? (
            <p className={styles.panelNote}>
              No position swaps through a pit cycle yet.
            </p>
          ) : (
            <ul className={styles.plainList}>
              {battles.map((b) => (
                <li key={`${b.early}-${b.late}-${b.earlyLap}`}>
                  <Badge tone={b.outcome === "undercut" ? "success" : "info"}>
                    {capitalize(b.outcome)}
                  </Badge>{" "}
                  {b.outcome === "undercut"
                    ? `${labelFor(model.lookup, b.early).acronym} (lap ${b.earlyLap}) jumped ${labelFor(model.lookup, b.late).acronym}`
                    : `${labelFor(model.lookup, b.late).acronym} (lap ${b.lateLap}) jumped ${labelFor(model.lookup, b.early).acronym}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
