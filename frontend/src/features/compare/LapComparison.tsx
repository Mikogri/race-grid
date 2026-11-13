import { useQueries } from "@tanstack/react-query";
import { driverLookup, labelFor } from "../../analytics/drivers";
import {
  buildTrace,
  deltaTrace,
  type LapTrace,
  type TracePoint,
} from "../../analytics/lapCompare";
import type { Session } from "../../api/openf1/types";
import { LineChart, type ChartSeries } from "../../components/charts/LineChart";
import layout from "../../components/layout/PageLayout.module.css";
import { Card } from "../../components/ui/Card";
import {
  AnalysisLoader,
  EmptyState,
  ErrorState,
} from "../../components/ui/StateViews";
import table from "../../components/ui/Table.module.css";
import { TeamMarker } from "../../components/ui/TeamMarker";
import { sessionQuery } from "../../data/sessionData";
import { formatDelta, formatLapTime } from "../../lib/format";
import { TRACE_COLORS, specKey, type LapSpec } from "./lapSpecs";
import styles from "./Compare.module.css";

const placeholder = { session_key: -1, date_end: "" };

const CHANNELS: {
  key: keyof TracePoint;
  label: string;
  domain?: [number, number];
  step?: boolean;
  height: number;
  format: (v: number) => string;
}[] = [
  {
    key: "speed",
    label: "Speed (km/h)",
    height: 260,
    format: (v) => String(Math.round(v)),
  },
  {
    key: "throttle",
    label: "Throttle (%)",
    domain: [0, 100],
    height: 180,
    format: (v) => String(Math.round(v)),
  },
  {
    key: "brake",
    label: "Brake",
    domain: [0, 1],
    step: true,
    height: 110,
    format: (v) => (v > 0.5 ? "On" : "Off"),
  },
  {
    key: "gear",
    label: "Gear",
    domain: [0, 8],
    step: true,
    height: 150,
    format: (v) => String(Math.round(v)),
  },
  {
    key: "rpm",
    label: "RPM",
    height: 180,
    format: (v) => Math.round(v).toLocaleString("en-GB"),
  },
  {
    key: "drs",
    label: "DRS",
    domain: [0, 1],
    step: true,
    height: 100,
    format: (v) => (v > 0.5 ? "Open" : "Closed"),
  },
];

export function LapComparison({
  specs,
  sessionByKey,
}: {
  specs: LapSpec[];
  sessionByKey: Map<number, Session>;
}) {
  const sessionOf = (spec: LapSpec) =>
    sessionByKey.get(spec.sessionKey) ?? placeholder;
  const laps = useQueries({
    queries: specs.map((spec) =>
      sessionQuery("laps", sessionOf(spec), { driver_number: spec.driver }),
    ),
  });
  const drivers = useQueries({
    queries: specs.map((spec) => sessionQuery("drivers", sessionOf(spec))),
  });
  const lapRecords = specs.map(
    (spec, i) => laps[i]?.data?.find((l) => l.lap_number === spec.lap) ?? null,
  );
  const telemetry = useQueries({
    queries: specs.map((spec, i) => {
      const lap = lapRecords[i];
      const start = lap?.date_start ? new Date(lap.date_start).getTime() : 0;
      return {
        ...sessionQuery("car_data", sessionOf(spec), {
          driver_number: spec.driver,
          "date>=": new Date(start - 1000).toISOString(),
          "date<=": new Date(
            start + ((lap?.lap_duration ?? 0) + 1) * 1000,
          ).toISOString(),
        }),
        enabled: Boolean(lap?.date_start && lap.lap_duration),
      };
    }),
  });

  const error = [...laps, ...drivers, ...telemetry].find((q) => q.error)?.error;
  if (error) return <ErrorState error={error} />;
  const missing = specs.filter((_, i) => laps[i]?.data && !lapRecords[i]);
  const loaded = telemetry.filter((q) => q.data).length;
  if (loaded < specs.length && missing.length === 0) {
    return (
      <Card>
        <AnalysisLoader
          title="Aligning laps"
          progress={{ done: loaded, total: specs.length }}
        />
      </Card>
    );
  }

  const traces = specs.map((spec, i) => {
    const lap = lapRecords[i];
    const trace =
      lap && telemetry[i]?.data
        ? buildTrace(lap, telemetry[i].data ?? [])
        : null;
    const session = sessionByKey.get(spec.sessionKey);
    const driver = labelFor(driverLookup(drivers[i]?.data), spec.driver);
    return {
      spec,
      trace,
      driver,
      color: TRACE_COLORS[i % TRACE_COLORS.length],
      label: `${driver.acronym} ${session?.year ?? ""} ${session?.session_name ?? ""} L${spec.lap}`,
    };
  });
  const valid = traces.filter(
    (t): t is (typeof traces)[number] & { trace: LapTrace } => t.trace !== null,
  );
  const reference = valid[0];
  if (!reference)
    return <EmptyState title="No telemetry available for the selected laps" />;

  const bestSector = [1, 2, 3].map((s) =>
    Math.min(
      ...valid.map(
        (t) =>
          (s === 1
            ? t.trace.lap.duration_sector_1
            : s === 2
              ? t.trace.lap.duration_sector_2
              : t.trace.lap.duration_sector_3) ?? Infinity,
      ),
    ),
  );
  const channelSeries = (
    key: keyof TracePoint,
    step?: boolean,
  ): ChartSeries[] =>
    valid.map((t) => ({
      id: specKey(t.spec),
      label: t.label,
      color: t.color,
      step,
      points: t.trace.points.map((p) => ({ x: p.progress * 100, y: p[key] })),
    }));
  const deltaSeries: ChartSeries[] = valid.map((t) => ({
    id: specKey(t.spec),
    label: t.label,
    color: t.color,
    points: deltaTrace(reference.trace, t.trace),
  }));
  const hasDrs = valid.some((t) => t.trace.points.some((p) => p.drs > 0));

  return (
    <div className={layout.stack}>
      <Card
        title="Laps"
        info="Telemetry is aligned on lap progress (0–100%), integrated from speed over time. Delta is time lost (+) or gained (−) against the first lap."
        flush
      >
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Lap</th>
                <th className={table.right}>Lap time</th>
                <th className={table.right}>Gap</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>S1</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>S2</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>S3</th>
                <th className={`${table.right} ${table.optionalNarrow}`}>
                  Top speed
                </th>
                <th
                  className={`${table.right} ${table.optionalNarrow}`}
                  title="Integrated from speed telemetry (RaceGrid derived)"
                >
                  Distance ≈
                </th>
              </tr>
            </thead>
            <tbody>
              {traces.map((t) => {
                const lap = t.trace?.lap;
                const sectors = lap
                  ? [
                      lap.duration_sector_1,
                      lap.duration_sector_2,
                      lap.duration_sector_3,
                    ]
                  : [];
                return (
                  <tr key={specKey(t.spec)}>
                    <td>
                      <span className={styles.lapLabel}>
                        <span
                          className={styles.swatch}
                          style={{ background: t.color }}
                        />
                        <TeamMarker color={t.driver.color} />
                        <span className={table.primary}>{t.label}</span>
                      </span>
                    </td>
                    <td
                      className={`${table.right} ${table.time} ${table.strong}`}
                    >
                      {lap ? formatLapTime(lap.lap_duration) : "No telemetry"}
                    </td>
                    <td className={`${table.right} ${table.time}`}>
                      {lap && t !== reference
                        ? formatDelta(
                            (lap.lap_duration ?? 0) -
                              (reference.trace.lap.lap_duration ?? 0),
                          )
                        : "—"}
                    </td>
                    {[0, 1, 2].map((i) => (
                      <td
                        key={i}
                        className={`${table.right} ${table.time} ${table.optionalNarrow} ${valid.length > 1 && sectors[i] != null && sectors[i] === bestSector[i] ? styles.best : ""}`}
                      >
                        {formatLapTime(sectors[i])}
                      </td>
                    ))}
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {t.trace
                        ? `${Math.max(...t.trace.points.map((p) => p.speed))} km/h`
                        : "—"}
                    </td>
                    <td className={`${table.right} ${table.optionalNarrow}`}>
                      {t.trace
                        ? `${(t.trace.distanceMetres / 1000).toFixed(2)} km`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title={`Delta to ${reference.label} (s)`}>
        <LineChart
          label="Time delta along the lap"
          series={deltaSeries}
          height={260}
          xDomain={[0, 100]}
          formatX={(x) => `${Math.round(x)}%`}
          formatY={(y) => formatDelta(y, 2)}
        />
      </Card>
      <Card title="Telemetry overlay">
        <div className={styles.channels}>
          {CHANNELS.filter((c) => c.key !== "drs" || hasDrs).map((c) => (
            <div key={c.key}>
              <p className={styles.channelTitle}>{c.label}</p>
              <LineChart
                label={`${c.label} overlay`}
                series={channelSeries(c.key, c.step)}
                height={c.height}
                xDomain={[0, 100]}
                yDomain={c.domain}
                formatX={(x) => `${Math.round(x)}%`}
                formatY={c.format}
                showLegend={c.key === "speed"}
              />
            </div>
          ))}
          {!hasDrs && (
            <p className={table.caption}>
              No DRS activations in the selected laps.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
