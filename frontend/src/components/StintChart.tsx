import type { DriverLabel } from "../analytics/drivers";
import type { PitStop, Stint } from "../api/openf1/types";
import { tyreColor } from "../lib/tyres";
import styles from "./StintChart.module.css";

interface StintChartProps {
  drivers: DriverLabel[];
  stints: Stint[];
  pits: PitStop[];
  totalLaps: number;
  /** Replay playhead lap; stints after it are dimmed. */
  currentLap?: number | null;
  selectedDriver?: number | null;
  onSelectDriver?: (driverNumber: number) => void;
}

/** Tyre stints per driver across the race distance (lap axis). */
export function StintChart({
  drivers,
  stints,
  pits,
  totalLaps,
  currentLap = null,
  selectedDriver = null,
  onSelectDriver,
}: StintChartProps) {
  const pct = (lap: number) => `${(Math.max(0, lap) / totalLaps) * 100}%`;
  return (
    <div
      className={styles.chart}
      role="table"
      aria-label="Tyre stints by driver"
    >
      {drivers.map((driver) => {
        const driverStints = stints
          .filter((s) => s.driver_number === driver.driverNumber)
          .sort((a, b) => a.stint_number - b.stint_number);
        const driverPits = pits.filter(
          (p) => p.driver_number === driver.driverNumber,
        );
        return (
          <div
            key={driver.driverNumber}
            role="row"
            className={`${styles.row} ${selectedDriver === driver.driverNumber ? styles.selected : ""} ${onSelectDriver ? styles.clickable : ""}`}
            onClick={() => onSelectDriver?.(driver.driverNumber)}
          >
            <span role="rowheader" className={styles.label}>
              <span
                className={styles.marker}
                style={{ background: driver.color }}
              />
              {driver.acronym}
            </span>
            <span role="cell" className={styles.track}>
              {driverStints.map((stint) => {
                const start = (stint.lap_start ?? 1) - 1;
                const end = stint.lap_end ?? currentLap ?? totalLaps;
                const future = currentLap !== null && start >= currentLap;
                return (
                  <span
                    key={stint.stint_number}
                    className={`${styles.stint} ${future ? styles.future : ""}`}
                    style={{
                      left: pct(start),
                      width: `calc(${pct(end - start)} - 2px)`,
                      background: tyreColor(stint.compound),
                    }}
                    title={`${driver.acronym} stint ${stint.stint_number}: ${stint.compound ?? "unknown"} laps ${stint.lap_start ?? "?"}–${stint.lap_end ?? "?"}${stint.tyre_age_at_start ? `, ${stint.tyre_age_at_start} laps old at start` : ""}`}
                  />
                );
              })}
              {driverPits.map((pit) => (
                <span
                  key={pit.date}
                  className={styles.pit}
                  style={{ left: pct(pit.lap_number) }}
                  title={`Pit lap ${pit.lap_number}: lane ${pit.lane_duration ?? "—"} s`}
                />
              ))}
            </span>
          </div>
        );
      })}
      {currentLap !== null && (
        <span
          className={styles.playhead}
          style={{
            left: `calc(56px + (100% - 56px) * ${currentLap / totalLaps})`,
          }}
          aria-hidden="true"
        />
      )}
      <div className={styles.axis} aria-hidden="true">
        <span />
        <span className={styles.axisTrack}>
          {[
            1,
            Math.round(totalLaps / 4),
            Math.round(totalLaps / 2),
            Math.round((totalLaps * 3) / 4),
            totalLaps,
          ].map((lap) => (
            <span key={lap} style={{ left: pct(lap - (lap === 1 ? 1 : 0)) }}>
              {lap}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
