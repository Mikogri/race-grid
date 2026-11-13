import type { Session } from "../../api/openf1/types";
import { LineChart } from "../../components/charts/LineChart";
import layout from "../../components/layout/PageLayout.module.css";
import { Card } from "../../components/ui/Card";
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from "../../components/ui/StateViews";
import { useSessionData } from "../../data/sessionData";
import { formatClock } from "../../lib/format";
import { toMs } from "../../lib/stats";

export function WeatherTab({ session }: { session: Session }) {
  const weather = useSessionData("weather", session);
  if (weather.error)
    return (
      <ErrorState
        error={weather.error}
        onRetry={() => void weather.refetch()}
      />
    );
  if (weather.isPending) return <Skeleton rows={8} />;
  if (!weather.data?.length)
    return <EmptyState title="No weather data for this session" />;

  const start = toMs(session.date_start);
  const rows = weather.data.map((w) => ({
    ...w,
    t: (toMs(w.date) - start) / 1000,
  }));
  const rained = rows.some((w) => w.rainfall > 0);
  const series = (
    key:
      | "air_temperature"
      | "track_temperature"
      | "humidity"
      | "wind_speed"
      | "rainfall",
  ) => rows.map((w) => ({ x: w.t, y: w[key] }));
  const formatX = (x: number) => formatClock(x);

  return (
    <div className={layout.twoCol}>
      <Card title="Temperature (°C)">
        <LineChart
          label="Air and track temperature over the session"
          series={[
            {
              id: "track",
              label: "Track",
              color: "var(--chart-4)",
              points: series("track_temperature"),
            },
            {
              id: "air",
              label: "Air",
              color: "var(--chart-1)",
              points: series("air_temperature"),
            },
          ]}
          formatX={formatX}
          formatY={(y) => `${y.toFixed(1)}°`}
        />
      </Card>
      <Card title="Humidity (%)">
        <LineChart
          label="Humidity over the session"
          series={[
            {
              id: "hum",
              label: "Humidity",
              color: "var(--chart-1)",
              points: series("humidity"),
            },
          ]}
          formatX={formatX}
          formatY={(y) => `${Math.round(y)}%`}
        />
      </Card>
      <Card title="Wind speed (m/s)">
        <LineChart
          label="Wind speed over the session"
          series={[
            {
              id: "wind",
              label: "Wind",
              color: "var(--chart-1)",
              points: series("wind_speed"),
            },
          ]}
          formatX={formatX}
          formatY={(y) => y.toFixed(1)}
        />
      </Card>
      <Card title="Rainfall">
        {rained ? (
          <LineChart
            label="Rainfall indicator over the session"
            series={[
              {
                id: "rain",
                label: "Rain",
                color: "var(--chart-1)",
                points: series("rainfall"),
                step: true,
              },
            ]}
            yDomain={[0, 1]}
            yTicks={[0, 1]}
            formatX={formatX}
            formatY={(y) => (y > 0 ? "Rain" : "Dry")}
          />
        ) : (
          <EmptyState title="Dry session">
            OpenF1 reported no rainfall at any sample.
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
