import type { CarDataRecord } from '../../api/openf1/types';
import { driverLapAt, type ReplayModel } from '../../analytics/replay/model';
import { labelFor } from '../../analytics/drivers';
import { LineChart, type ChartSeries } from '../../components/charts/LineChart';
import { IconActivity, IconFlag } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { ErrorState } from '../../components/ui/StateViews';
import { toMs } from '../../lib/stats';
import { useClock, type ReplayClock } from './clock';
import { isDrsOpen } from '../../lib/telemetry';
import styles from './ReplayPage.module.css';

interface Channel {
  id: string;
  label: string;
  unit: string;
  color: string;
  pick: (r: CarDataRecord) => number;
  domain?: [number, number];
  step?: boolean;
  ticks?: number[];
  format?: (v: number) => string;
}

// Fixed domains and at most three short ticks per channel, so every chart reads the same way.
const CHANNELS: Channel[] = [
  { id: 'speed', color: 'var(--chart-speed)', label: 'Speed', unit: 'km/h', pick: (r) => r.speed, domain: [0, 350], ticks: [0, 150, 300] },
  { id: 'throttle', color: 'var(--chart-throttle)', label: 'Throttle', unit: '%', pick: (r) => Math.min(100, r.throttle), domain: [0, 100], ticks: [0, 50, 100] },
  { id: 'brake', color: 'var(--chart-brake)', label: 'Brake', unit: '', pick: (r) => (r.brake > 0 ? 1 : 0), domain: [0, 1], step: true, ticks: [0, 1], format: (v) => (v > 0.5 ? 'On' : 'Off') },
  { id: 'rpm', color: 'var(--chart-rpm)', label: 'RPM', unit: '×1000', pick: (r) => r.rpm, domain: [0, 13000], ticks: [0, 6000, 12000], format: (v) => `${Math.round(v / 1000)}k` },
  { id: 'gear', color: 'var(--chart-gear)', label: 'Gear', unit: '', pick: (r) => r.n_gear, domain: [0, 8], step: true, ticks: [0, 4, 8] },
  { id: 'drs', color: 'var(--chart-drs)', label: 'DRS', unit: '', pick: (r) => (isDrsOpen(r.drs) ? 1 : 0), domain: [0, 1], step: true, ticks: [0, 1], format: (v) => (v > 0.5 ? 'On' : 'Off') },
];

/** Shared Y-label gutter: the widest tick ("300", "12k", "Off") fits. */
const Y_AXIS_WIDTH = 36;
/** Every channel gets the same plot height, so the grid reads as one even layout. */
const CHART_HEIGHT = 112;

/** Telemetry of the current lap of the selected driver, up to the replay playhead. */
export function TelemetryPanel({
  clock,
  model,
  driverNumber,
  telemetry,
  loading,
  error,
}: {
  clock: ReplayClock;
  model: ReplayModel;
  driverNumber: number;
  telemetry: CarDataRecord[];
  loading: boolean;
  error: unknown;
}) {
  const { time } = useClock(clock, 8);
  const lap = driverLapAt(model, driverNumber, time);
  const driver = labelFor(model.lookup, driverNumber);
  if (error) return <ErrorState error={error} />;
  if (!lap?.date_start) return <TelemetryEmpty icon={<IconFlag size={20} stroke={1.5} />} title="Waiting for the start" detail="Telemetry follows the selected driver lap by lap." />;

  const lapStart = toMs(lap.date_start);
  const previous = model.lapsByDriver.get(driverNumber)?.find((l) => l.lap_number === lap.lap_number - 1)?.lap_duration;
  const elapsed = (time - lapStart) / 1000;
  const xMax = Math.max(elapsed, previous ?? lap.lap_duration ?? 90);
  const inLap = telemetry.filter((r) => {
    const ms = toMs(r.date);
    return ms >= lapStart && ms <= time;
  });
  const hasDrs = telemetry.some((r) => r.drs !== null);
  const channels = CHANNELS.filter((c) => c.id !== 'drs' || hasDrs);

  if (inLap.length === 0) {
    return <TelemetryEmpty
        icon={<IconActivity size={20} stroke={1.5} />}
        title={loading ? 'Loading telemetry…' : 'No telemetry yet'}
        detail={loading ? `Fetching car data for ${driver.acronym}, lap ${lap.lap_number}.` : `${driver.acronym} has no car data samples on lap ${lap.lap_number} so far. Press play or move the timeline.`}
        pulse={loading}
      />;
  }

  return (
    <div className={styles.telemetry}>
      <p className={styles.panelNote}>
        {driver.acronym} · lap {lap.lap_number} · {elapsed.toFixed(1)} s into the lap.
      </p>
      {channels.map((channel, index) => {
        const series: ChartSeries[] = [
          {
            id: channel.id,
            label: channel.label,
            color: channel.color,
            step: channel.step,
            points: inLap.map((r) => ({ x: (toMs(r.date) - lapStart) / 1000, y: channel.pick(r) })),
          },
        ];
        return (
          <div key={channel.id} className={styles.channel}>
            <div className={styles.channelHead}>
              <span className={styles.channelLabel}>
                <span className={styles.channelSwatch} style={{ background: channel.color }} aria-hidden="true" />
                {channel.label}
                {channel.unit && <span className={styles.channelUnit}>{channel.unit}</span>}
              </span>
              <span className={`${styles.channelValue} tabular`} style={{ color: channel.color }}>
                {(channel.format ?? ((v: number) => Math.round(v).toLocaleString('en-GB')))(channel.pick(inLap[inLap.length - 1]))}
              </span>
            </div>
            <LineChart
              label={`${driver.acronym} ${channel.label} on lap ${lap.lap_number}`}
              series={series}
              height={CHART_HEIGHT + (index >= channels.length - 2 ? 24 : 0)}
              yAxisWidth={Y_AXIS_WIDTH}
              showXAxis={index >= channels.length - 2}
              detailedGrid
              className={styles.compactChart}
              xDomain={[0, xMax]}
              yDomain={channel.domain}
              yTicks={channel.ticks}
              formatX={(x) => `${x.toFixed(0)} s`}
              formatY={channel.format ?? ((y) => Math.round(y).toLocaleString('en-GB'))}
              cursorX={elapsed}
              showLegend={false}
            />
          </div>
        );
      })}
      {!hasDrs && <p className={styles.panelNote}>No DRS channel in this session.</p>}
    </div>
  );
}

/** Quiet empty / loading state of the telemetry tab: icon tile, title, one line of help. */
function TelemetryEmpty({ icon, title, detail, pulse = false }: { icon: ReactNode; title: string; detail: string; pulse?: boolean }) {
  return (
    <div className={styles.telemetryEmpty} role="status">
      <span className={pulse ? `${styles.telemetryEmptyIcon} ${styles.pulse}` : styles.telemetryEmptyIcon} aria-hidden="true">
        {icon}
      </span>
      <p className={styles.telemetryEmptyTitle}>{title}</p>
      <p className={styles.telemetryEmptyDetail}>{detail}</p>
    </div>
  );
}
