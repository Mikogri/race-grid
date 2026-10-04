import { useId, useState, type MouseEvent } from 'react';
import { useElementWidth } from './useElementWidth';
import styles from './LineChart.module.css';

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  /** Token (`var(--chart-1)`) or a data colour (team). */
  color: string;
  points: ChartPoint[];
  /** Step interpolation for discrete channels (gear, DRS, brake on/off). */
  step?: boolean;
  dashed?: boolean;
  width?: number;
}

interface LineChartProps {
  series: ChartSeries[];
  height?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  /** Positions: smaller is better and drawn on top. */
  yReversed?: boolean;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  xTicks?: number[];
  yTicks?: number[];
  /** Vertical line synchronised with an external timeline (replay playhead). */
  cursorX?: number | null;
  onSelectX?: (x: number) => void;
  label: string;
  showLegend?: boolean;
  /** Show the legend even for a single series (keeps charts side by side the same height). */
  alwaysShowLegend?: boolean;
  /** Fixed Y-label gutter, so stacked charts line up. */
  yAxisWidth?: number;
  /** Hide the X labels (charts stacked over one shared axis). */
  showXAxis?: boolean;
  /** Denser grid: more X lines and a faint minor line between every pair of ticks. */
  detailedGrid?: boolean;
  className?: string;
}

const PAD_BASE = { top: 8, right: 12 };
const X_AXIS_HEIGHT = 24;
/** Approximate width of one tick character at 12 px tabular figures. */
const CHAR_PX = 7;

function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

function extent(series: ChartSeries[], pick: (p: ChartPoint) => number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      const v = pick(p);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return min === Infinity ? [0, 1] : [min, max];
}

/** Nearest point by x (points sorted by x). */
function nearest(points: ChartPoint[], x: number): ChartPoint | null {
  if (points.length === 0) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].x < x) lo = mid;
    else hi = mid;
  }
  return Math.abs(points[lo].x - x) <= Math.abs(points[hi].x - x) ? points[lo] : points[hi];
}

/**
 * Smooth path through screen points (monotone cubic, Fritsch–Carlson): curves never overshoot the data,
 * so a position line never dips past P1 between rounds.
 */
function smoothPath(points: [number, number][]): string {
  const n = points.length;
  if (n === 0) return '';
  const fmt = (v: number) => v.toFixed(1);
  if (n < 3) return points.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)},${fmt(y)}`).join('');
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push(dx[i] === 0 ? 0 : (points[i + 1][1] - points[i][1]) / dx[i]);
  }
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    if (slope[i - 1] * slope[i] <= 0) return 0;
    return (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]);
  });
  let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = points[i];
    const [xb, yb] = points[i + 1];
    const h = dx[i] / 3;
    d += `C${fmt(xa + h)},${fmt(ya + tangent[i] * h)} ${fmt(xb - h)},${fmt(yb - tangent[i + 1] * h)} ${fmt(xb)},${fmt(yb)}`;
  }
  return d;
}

/** Line chart in the shared chart theme (DESIGN_SYSTEM.md §13). */
export function LineChart({
  series,
  height = 180,
  xDomain,
  yDomain,
  yReversed = false,
  formatX = (x) => String(Math.round(x)),
  formatY = (y) => String(Math.round(y)),
  xTicks,
  yTicks,
  cursorX = null,
  onSelectX,
  label,
  showLegend = true,
  alwaysShowLegend = false,
  yAxisWidth,
  showXAxis = true,
  detailedGrid = false,
  className,
}: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const gradientId = useId();

  const [x0, x1] = xDomain ?? extent(series, (p) => p.x);
  const autoY = extent(series, (p) => p.y);
  const [y0, y1] = yDomain ?? [autoY[0], autoY[1] === autoY[0] ? autoY[0] + 1 : autoY[1]];
  const gridY = yTicks ?? niceTicks(Math.min(y0, y1), Math.max(y0, y1), 4);
  // Left gutter sized to the longest Y label (lap times need more room than percentages).
  const PAD = {
    ...PAD_BASE,
    bottom: showXAxis ? X_AXIS_HEIGHT : 8,
    left: yAxisWidth ?? Math.max(36, Math.max(...gridY.map((t) => formatY(t).length)) * CHAR_PX + 12),
  };
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + ((x - x0) / (x1 - x0 || 1)) * innerW;
  const sy = (y: number) => {
    const t = (y - y0) / (y1 - y0 || 1);
    return PAD.top + (yReversed ? t : 1 - t) * innerH;
  };

  // Continuous series are smoothed; discrete channels (gear, DRS) keep their steps.
  const paths = series.map((s) => {
    if (!s.step) return smoothPath(s.points.map((p) => [sx(p.x), sy(p.y)]));
    let d = '';
    s.points.forEach((p, i) => {
      const px = sx(p.x).toFixed(1);
      const py = sy(p.y).toFixed(1);
      d += i === 0 ? `M${px},${py}` : `H${px}V${py}`;
    });
    return d;
  });

  // Primary lines use the 2 px chart token; crowded charts drop to the secondary weight so lines stay readable.
  const lineWidth = (s: ChartSeries) => s.width ?? (s.dashed || series.length > 2 ? 'var(--chart-line-secondary)' : 'var(--chart-line)');

  // One soft fade under a single continuous series (reference area charts); never with several series.
  const area = series.length === 1 && !series[0].step && !series[0].dashed && series[0].points.length > 1 ? series[0] : null;
  const areaPath =
    area && paths[0]
      ? `${paths[0]}L${sx(area.points[area.points.length - 1].x).toFixed(1)},${(PAD.top + innerH).toFixed(1)}L${sx(area.points[0].x).toFixed(1)},${(PAD.top + innerH).toFixed(1)}Z`
      : null;

  // X ticks spaced by the longest label (round names are long in the mono face), so labels never overlap.
  const labelPx = Math.max(...Array.from({ length: 21 }, (_, i) => formatX(x0 + ((x1 - x0) * i) / 20).length)) * CHAR_PX + 24;
  const gridX = xTicks ?? niceTicks(x0, x1, Math.max(2, Math.floor(innerW / Math.max(detailedGrid ? 64 : 110, labelPx))));
  const between = (ticks: number[]) => ticks.slice(1).map((t, i) => (t + ticks[i]) / 2);
  const minorX = detailedGrid ? between(gridX) : [];
  const minorY = detailedGrid ? between(gridY) : [];

  const toDataX = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - PAD.left;
    return x0 + (Math.min(innerW, Math.max(0, px)) / innerW) * (x1 - x0);
  };

  const tooltipX = hoverX ?? null;
  const tooltipRows =
    tooltipX === null
      ? []
      : series
          .map((s) => ({ s, p: nearest(s.points, tooltipX) }))
          .filter((row): row is { s: ChartSeries; p: ChartPoint } => row.p !== null);

  return (
    <div className={className ? `${styles.chart} ${className}` : styles.chart}>
      {showLegend && (series.length > 1 || alwaysShowLegend) && (
        <ul className={styles.legend}>
          {series.map((s) => (
            <li key={s.id}>
              <span className={s.dashed ? styles.swatchDashed : styles.swatch} style={s.dashed ? { borderColor: s.color } : { background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={ref} className={styles.plot} style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            onMouseMove={(e) => setHoverX(toDataX(e))}
            onMouseLeave={() => setHoverX(null)}
            onClick={(e) => onSelectX?.(toDataX(e))}
            className={onSelectX ? styles.interactive : undefined}
          >
            {area && (
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={area.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={area.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
            )}
            {/* The plot is always closed by a dotted frame on all four sides. */}
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} className={styles.gridFrame} />
            {minorY.map((t) => (
              <line key={`my${t}`} x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} className={styles.gridMinor} />
            ))}
            {minorX.map((t) => (
              <line key={`mx${t}`} x1={sx(t)} x2={sx(t)} y1={PAD.top} y2={PAD.top + innerH} className={styles.gridMinor} />
            ))}
            {gridY.map((t) => (
              <g key={`y${t}`}>
                <line x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
                <text x={PAD.left - 8} y={sy(t)} className={styles.tickY}>
                  {formatY(t)}
                </text>
              </g>
            ))}
            {/* Vertical grid at every X tick; labels only on the shared bottom axis. */}
            {gridX.map((t) => (
              <g key={`x${t}`}>
                <line x1={sx(t)} x2={sx(t)} y1={PAD.top} y2={PAD.top + innerH} className={styles.grid} />
                {showXAxis && (
                  <text x={sx(t)} y={height - 6} className={styles.tickX}>
                    {formatX(t)}
                  </text>
                )}
              </g>
            ))}
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} className="rg-fade" />}
            {series.map((s, i) => (
              <path
                key={s.id}
                d={paths[i]}
                className={`rg-fade ${styles.line}`}
                stroke={s.color}
                strokeWidth={lineWidth(s)}
                strokeDasharray={s.dashed ? '4 3' : undefined}
              />
            ))}
            {cursorX !== null && cursorX >= x0 && cursorX <= x1 && (
              <line x1={sx(cursorX)} x2={sx(cursorX)} y1={PAD.top} y2={PAD.top + innerH} className={styles.cursor} />
            )}
            {tooltipX !== null && (
              <>
                <line x1={sx(tooltipX)} x2={sx(tooltipX)} y1={PAD.top} y2={PAD.top + innerH} className={styles.hoverLine} />
                {tooltipRows.map(({ s, p }) => (
                  <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={s.color} className={styles.hoverPoint} />
                ))}
              </>
            )}
          </svg>
        )}
        {tooltipX !== null && tooltipRows.length > 0 && (
          <div className={styles.tooltip} style={{ left: Math.min(sx(tooltipX) + 12, width - 180) }}>
            <p className={styles.tooltipTitle}>{formatX(tooltipX)}</p>
            {tooltipRows.map(({ s, p }) => (
              <p key={s.id} className={styles.tooltipRow}>
                <span className={styles.swatch} style={{ background: s.color }} />
                <span className={styles.tooltipLabel}>{s.label}</span>
                <span className={styles.tooltipValue}>{formatY(p.y)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
