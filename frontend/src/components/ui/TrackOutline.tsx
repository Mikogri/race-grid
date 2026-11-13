import { useId, type ReactNode } from "react";
import { pathStart, tangentAngle } from "../../lib/trackFrame";
import styles from "./TrackOutline.module.css";

/** Tight viewBox around a path ("M x,y L x,y …") so thumbnails fill their box. */
export function fitViewBox(
  d: string,
): { viewBox: string; size: number } | null {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number);
  if (!nums || nums.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  const size = Math.max(maxX - minX, maxY - minY);
  const pad = size * 0.04;
  return {
    viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`,
    size,
  };
}

interface TrackOutlineProps {
  outline: string;
  /** Three timing-sector paths; when present they are drawn instead of the plain outline. */
  sectors?: readonly string[];
  highlightSector?: number | null;
  /** Stroke colour per sector (e.g. the selected driver's sector times); unset sectors keep the default. */
  sectorColors?: readonly (string | undefined)[];
  startGate?: { x: number; y: number } | null;
  viewBox?: string;
  className?: string;
  title?: string;
  /** Overlay in the same SVG coordinate space (cars, markers). */
  children?: ReactNode;
  variant?: "thumb" | "detail";
  /** Rotate the whole drawing (outline and overlay) around a point, in degrees. */
  rotation?: { angle: number; cx: number; cy: number };
}

/** Circuit outline from the local library (approximate reference-lap trajectory). */
export function TrackOutline({
  outline,
  sectors,
  highlightSector = null,
  sectorColors,
  startGate,
  viewBox,
  className,
  title,
  children,
  variant = "detail",
  rotation,
}: TrackOutlineProps) {
  // Thumbnails crop to the circuit; the detail map keeps the shared 1000-unit frame (cars use it).
  const fitted = variant === "thumb" && !viewBox ? fitViewBox(outline) : null;
  const thumbStroke = fitted ? { strokeWidth: fitted.size * 0.012 } : undefined;
  const checkerId = useId();
  return (
    <svg
      viewBox={viewBox ?? fitted?.viewBox ?? "0 0 1000 1000"}
      className={[styles.svg, styles[variant], className]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label={title ?? "Circuit outline"}
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        transform={
          rotation
            ? `rotate(${rotation.angle} ${rotation.cx} ${rotation.cy})`
            : undefined
        }
      >
        {sectors && variant === "detail" ? (
          sectors.map((d, i) => (
            <path
              key={i}
              d={d}
              style={
                sectorColors?.[i] ? { stroke: sectorColors[i] } : undefined
              }
              className={[
                "rg-draw",
                styles.line,
                highlightSector === i + 1 ? styles.highlight : "",
                highlightSector && highlightSector !== i + 1 ? styles.dim : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ))
        ) : (
          <path
            d={outline}
            className={`rg-draw ${styles.line}`}
            style={thumbStroke}
          />
        )}
        {/* Sector boundaries: a short bar across the track where each sector after S1 begins. */}
        {sectors &&
          variant === "detail" &&
          sectors.slice(1).map((d, i) => {
            const start = pathStart(d);
            if (!start) return null;
            return (
              <line
                key={`cut${i}`}
                x1={0}
                x2={0}
                y1={-16}
                y2={16}
                className={styles.sectorCut}
                transform={`translate(${start.x} ${start.y}) rotate(${tangentAngle(outline, start.x, start.y)})`}
              />
            );
          })}
        {startGate && (
          // Start / finish: a chequered bar across the track.
          <g
            className={styles.start}
            transform={`translate(${startGate.x} ${startGate.y}) rotate(${tangentAngle(outline, startGate.x, startGate.y)})`}
          >
            <defs>
              <pattern
                id={checkerId}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" className={styles.checkerLight} />
                <rect width="4" height="4" className={styles.checkerDark} />
                <rect
                  x="4"
                  y="4"
                  width="4"
                  height="4"
                  className={styles.checkerDark}
                />
              </pattern>
            </defs>
            <rect
              x={-6}
              y={-20}
              width={12}
              height={40}
              rx={2}
              fill={`url(#${checkerId})`}
            />
          </g>
        )}
        {children}
      </g>
    </svg>
  );
}
