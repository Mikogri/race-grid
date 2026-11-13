import type { ReactNode } from "react";
import type { CarDataRecord } from "../../api/openf1/types";
import {
  driverLapAt,
  sectorsAt,
  timingAt,
  type ReplayModel,
} from "../../analytics/replay/model";
import { labelFor } from "../../analytics/drivers";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { TeamMarker } from "../../components/ui/TeamMarker";
import { TyreBadge } from "../../components/ui/TyreBadge";
import { formatGap, formatLapTime } from "../../lib/format";
import { lastIndexAtOrBefore, toMs } from "../../lib/stats";
import { isDrsOpen } from "../../lib/telemetry";
import { useClock, type ReplayClock } from "./clock";
import styles from "./ReplayPage.module.css";

export function SelectedDriverPanel({
  clock,
  model,
  driverNumber,
  telemetry,
  className,
  headerAction,
}: {
  clock: ReplayClock;
  model: ReplayModel;
  driverNumber: number;
  telemetry: CarDataRecord[];
  className?: string;
  /** Extra header control (the panel's collapse button). */
  headerAction?: ReactNode;
}) {
  const { time } = useClock(clock, 4);
  const driver = labelFor(model.lookup, driverNumber);
  const row = timingAt(model, time).find(
    (r) => r.driver.driverNumber === driverNumber,
  );
  const lap = driverLapAt(model, driverNumber, time);
  const laps = model.lapsByDriver.get(driverNumber) ?? [];
  const completed = laps.filter(
    (l) =>
      l.date_start &&
      l.lap_duration &&
      toMs(l.date_start) + l.lap_duration * 1000 <= time,
  );
  const lastLap = completed[completed.length - 1];
  const best = completed.reduce<number | null>(
    (b, l) =>
      l.lap_duration && (b === null || l.lap_duration < b) ? l.lap_duration : b,
    null,
  );
  const sectors = sectorsAt(model, driverNumber, time);
  const sectorTone = {
    fastest: styles.sectorFastest,
    personal: styles.sectorPersonal,
    slower: styles.sectorSlower,
  };
  const i = lastIndexAtOrBefore(telemetry, time, (t) => toMs(t.date));
  const live =
    i >= 0 && time - toMs(telemetry[i].date) < 2000 ? telemetry[i] : null;
  const pitCount = model.pits.filter(
    (p) => p.driver_number === driverNumber && toMs(p.date) <= time,
  ).length;

  const throttle = live ? Math.min(100, live.throttle) : null;

  return (
    <Card title="Selected driver" actions={headerAction} className={className}>
      <div className={styles.selectedHead}>
        <Avatar
          src={driver.headshotUrl}
          name={driver.name}
          size="lg"
          ring={driver.color}
        />
        <div className={styles.selectedName}>
          <p className={styles.selectedDriver}>{driver.name}</p>
          <p className={styles.selectedTeam}>
            <TeamMarker color={driver.color} />
            {driver.acronym} · {driver.teamName}
          </p>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Live</h3>
        <div className={styles.live} aria-live="off">
          <LiveValue
            label="Speed"
            value={live ? `${live.speed}` : "—"}
            unit="km/h"
          />
          <LiveValue label="Gear" value={live ? String(live.n_gear) : "—"} />
          <LiveValue
            label="RPM"
            value={live ? live.rpm.toLocaleString("en-GB") : "—"}
          />
        </div>
        <div className={styles.meters}>
          <Meter
            label="Throttle"
            value={throttle}
            display={throttle !== null ? `${throttle}%` : "—"}
            tone="throttle"
          />
          <Meter
            label="Brake"
            value={live ? (live.brake > 0 ? 100 : 0) : null}
            display={live ? (live.brake > 0 ? "On" : "Off") : "—"}
            tone="brake"
          />
          <Row label="DRS">
            <span
              className={
                live?.drs != null && isDrsOpen(live.drs)
                  ? styles.drsOpen
                  : undefined
              }
            >
              {live
                ? live.drs === null
                  ? "n/a"
                  : isDrsOpen(live.drs)
                    ? "Open"
                    : "Closed"
                : "—"}
            </span>
          </Row>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Timing</h3>
        <dl className={styles.rows}>
          <Row label="Lap">
            {lap ? `${lap.lap_number} / ${model.totalLaps}` : "—"}
          </Row>
          <Row label="Gap to leader">
            {row?.position === 1 ? "Leader" : formatGap(row?.gap)}
          </Row>
          <Row label="Interval">
            {row?.position === 1 ? "—" : formatGap(row?.interval)}
          </Row>
          <Row label="Last lap">{formatLapTime(lastLap?.lap_duration)}</Row>
          <Row label="Best lap">{formatLapTime(best)}</Row>
        </dl>
        <div className={styles.sectors} aria-label="Last lap sectors">
          {sectors.times.map((value, idx) => {
            const status = sectors.status[idx];
            return (
              <div
                key={idx}
                className={`${styles.sector} ${status ? sectorTone[status] : styles.sectorNone}`}
              >
                <span className={styles.sectorLabel}>S{idx + 1}</span>
                <span className={styles.sectorTime}>
                  {formatLapTime(value)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tyre</h3>
        <dl className={styles.rows}>
          <Row label="Compound">
            {row?.stint ? (
              <span className={styles.tyreValue}>
                <TyreBadge
                  compound={row.stint.compound}
                  age={row.tyreAge}
                  showAge={false}
                />
                {row.tyreAge != null && `${row.tyreAge} laps`}
              </span>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Stint">
            {row?.stint
              ? `#${row.stint.stint_number} from lap ${row.stint.lap_start ?? "?"}`
              : "—"}
          </Row>
          <Row label="Pit stops">{pitCount}</Row>
        </dl>
      </section>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.kv}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Meter({
  label,
  value,
  display,
  tone,
}: {
  label: string;
  value: number | null;
  display: string;
  tone: "throttle" | "brake";
}) {
  return (
    <div className={styles.meterRow}>
      <span className={styles.meterLabel}>{label}</span>
      <span className={styles.meterTrack} aria-hidden="true">
        <span
          className={`${styles.meterFill} ${styles[tone]}`}
          style={{ transform: `scaleX(${(value ?? 0) / 100})` }}
        />
      </span>
      <span className={`${styles.meterValue} tabular`}>{display}</span>
    </div>
  );
}

function LiveValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className={styles.liveItem}>
      <span className={styles.liveLabel}>{label}</span>
      <span className={`${styles.liveValue} tabular`}>
        {value}
        {unit && value !== "—" && (
          <span className={styles.liveUnit}>{unit}</span>
        )}
      </span>
    </div>
  );
}
