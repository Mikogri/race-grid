import { carPointAt, type CarSample } from '../../analytics/replay/carPositions';
import type { TrackPath } from '../../analytics/replay/trackPath';
import type { DriverLabel } from '../../analytics/drivers';
import type { Neutralisation } from '../../analytics/raceControl';
import { isNeutralisedAt } from '../../analytics/raceControl';
import { useMemo, type CSSProperties } from 'react';
import { useElementSize } from '../../components/charts/useElementSize';
import { TrackOutline } from '../../components/ui/TrackOutline';
import type { SectorStatus } from '../../analytics/replay/model';
import { landscapeFrame, pathStart, rotatePoint, tangentAngle } from '../../lib/trackFrame';
import { useClock, type ReplayClock } from './clock';
import styles from './ReplayPage.module.css';

interface TrackMapProps {
  clock: ReplayClock;
  outline: string | null;
  sectors: readonly string[] | undefined;
  startGate: { x: number; y: number } | null;
  path: TrackPath | null;
  samples: Map<number, CarSample[]>;
  drivers: DriverLabel[];
  retired: Set<number>;
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number) => void;
  loading: boolean;
  periods: Neutralisation[];
  approximateOutline: boolean;
  /** Colour status of the selected driver's last-lap sectors. */
  sectorStatus: SectorStatus[];
}

/** Distance (px) between a sector boundary and its tag, away from the track. */
const TAG_OFFSET = 26;

const SECTOR_COLOR: Record<NonNullable<SectorStatus>, string> = {
  fastest: 'var(--fastest)',
  personal: 'var(--personal-best)',
  slower: 'var(--sector-slower)',
};

export function TrackMap({
  clock,
  outline,
  sectors,
  startGate,
  path,
  samples,
  drivers,
  retired,
  selectedDriver,
  onSelectDriver,
  loading,
  periods,
  approximateOutline,
  sectorStatus,
}: TrackMapProps) {
  const { time } = useClock(clock, 60);
  const [canvasRef, size] = useElementSize<HTMLDivElement>();
  const neutralised = isNeutralisedAt(periods, time);
  // Turn the circuit to its widest orientation (least vertical space) and crop to it; cars share the frame.
  const frame = useMemo(() => (outline ? landscapeFrame(outline) : null), [outline]);
  const vb = frame?.viewBox;
  const scale = vb ? Math.min(size.width / vb.width, size.height / vb.height) : 0;
  const toScreen = (x: number, y: number) => {
    if (!frame || !vb) return null;
    const r = rotatePoint(frame, x, y);
    return { left: (size.width - vb.width * scale) / 2 + (r.x - vb.x) * scale, top: (size.height - vb.height * scale) / 2 + (r.y - vb.y) * scale };
  };
  const cars = drivers
    .filter((d) => !retired.has(d.driverNumber))
    .map((driver) => {
      const list = samples.get(driver.driverNumber);
      const point = list ? carPointAt(list, time, path) : null;
      return { driver, point, screen: point ? toScreen(point.x, point.y) : null };
    })
    .filter((c) => c.point !== null && c.screen !== null)
    // selected car drawn last = on top
    .sort((a, b) => Number(a.driver.driverNumber === selectedDriver) - Number(b.driver.driverNumber === selectedDriver));

  return (
    <div className={styles.map}>
      {neutralised && <span className={styles.neutralised}>{neutralised === 'SC' ? 'Safety car' : neutralised === 'VSC' ? 'Virtual safety car' : 'Red flag'}</span>}
      <div ref={canvasRef} className={styles.mapCanvas}>
        <TrackOutline
          outline={outline ?? ''}
          sectors={sectors}
          startGate={startGate}
          viewBox={vb ? `${vb.x} ${vb.y} ${vb.width} ${vb.height}` : undefined}
          rotation={frame ?? undefined}
          sectorColors={sectorStatus.map((status) => (status ? SECTOR_COLOR[status] : undefined))}
          title="Track map with live car positions"
        />
        {/* Sector tags sit beside the track (on the outer side of each boundary), never on it. */}
        {sectors?.map((d, i) => {
          const start = pathStart(d);
          const screen = start && outline && frame ? toScreen(start.x, start.y) : null;
          if (!start || !screen || !outline || !frame) return null;
          const normal = ((tangentAngle(outline, start.x, start.y) + frame.angle + 90) * Math.PI) / 180;
          let nx = Math.cos(normal);
          let ny = Math.sin(normal);
          if (nx * (screen.left - size.width / 2) + ny * (screen.top - size.height / 2) < 0) {
            nx = -nx;
            ny = -ny;
          }
          const status = sectorStatus[i];
          return (
            <span
              key={i}
              className={styles.sectorTag}
              style={
                {
                  transform: `translate(${(screen.left + nx * TAG_OFFSET).toFixed(1)}px, ${(screen.top + ny * TAG_OFFSET).toFixed(1)}px) translate(-50%, -50%)`,
                  '--sector': status ? SECTOR_COLOR[status] : 'var(--text-tertiary)',
                } as CSSProperties
              }
            >
              S{i + 1}
            </span>
          );
        })}
        {/* Cars are HTML over the SVG: crisp at any scale, and the labels can blur what is behind them. */}
        {cars.map(({ driver, point, screen }) => {
          if (!point || !screen) return null;
          const selected = driver.driverNumber === selectedDriver;
          return (
            <button
              key={driver.driverNumber}
              type="button"
              className={`${styles.car} ${selected ? styles.carSelected : ''} ${point.stale ? styles.carStale : ''}`}
              style={{ transform: `translate(${screen.left.toFixed(1)}px, ${screen.top.toFixed(1)}px)`, '--team': driver.color } as CSSProperties}
              onClick={() => onSelectDriver(driver.driverNumber)}
              aria-label={`${driver.acronym}, select driver`}
              aria-pressed={selected}
            >
              <span className={styles.carDot} aria-hidden="true" />
              <span className={styles.carLabel}>{driver.acronym}</span>
            </button>
          );
        })}
      </div>
      {loading && <span className={styles.mapStatus}>Loading car positions…</span>}
      {approximateOutline && <span className={styles.mapNote}>Outline reconstructed from this session's location data</span>}
    </div>
  );
}
