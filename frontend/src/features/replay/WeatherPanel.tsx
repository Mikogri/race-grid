import { latestAt, type ReplayModel } from "../../analytics/replay/model";
import { LineChart } from "../../components/charts/LineChart";
import { EmptyState } from "../../components/ui/StateViews";
import { formatClock } from "../../lib/format";
import { useClock, type ReplayClock } from "./clock";
import styles from "./ReplayPage.module.css";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function WeatherPanel({
  clock,
  model,
}: {
  clock: ReplayClock;
  model: ReplayModel;
}) {
  const { time } = useClock(clock, 1);
  const now = latestAt(model.weather, time);
  if (!now) return <EmptyState title="No weather samples for this session" />;
  const x = (ms: number) => (ms - model.startMs) / 1000;
  const cursor = x(time);
  const temps = [
    {
      id: "track",
      label: "Track",
      color: "var(--chart-speed)",
      points: model.weather.map((w) => ({
        x: x(w.ms),
        y: w.value.track_temperature,
      })),
    },
    {
      id: "air",
      label: "Air",
      color: "var(--chart-throttle)",
      points: model.weather.map((w) => ({
        x: x(w.ms),
        y: w.value.air_temperature,
      })),
    },
  ];

  return (
    <div className={styles.weather}>
      <div className={styles.live}>
        <Value label="Track" value={`${now.track_temperature.toFixed(1)} °C`} />
        <Value label="Air" value={`${now.air_temperature.toFixed(1)} °C`} />
        <Value label="Humidity" value={`${Math.round(now.humidity)} %`} />
        <Value
          label="Wind"
          value={`${now.wind_speed.toFixed(1)} m/s ${COMPASS[Math.round(now.wind_direction / 45) % 8]}`}
        />
        <Value label="Rain" value={now.rainfall > 0 ? "Yes" : "No"} />
        <Value label="Pressure" value={`${Math.round(now.pressure)} mbar`} />
      </div>
      <LineChart
        label="Track and air temperature during the race"
        series={temps}
        height={150}
        cursorX={cursor}
        formatX={(v) => formatClock(v)}
        formatY={(v) => `${v.toFixed(0)}°`}
      />
    </div>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.liveItem}>
      <span className={styles.readoutLabel}>{label}</span>
      <span className={`${styles.liveValue} tabular`}>{value}</span>
    </div>
  );
}
