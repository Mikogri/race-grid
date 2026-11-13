import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import {
  raceLapAt,
  type ReplayEvent,
  type ReplayModel,
} from "../../analytics/replay/model";
import { Button } from "../../components/ui/Button";
import { Segmented } from "../../components/ui/Segmented";
import { formatClock, formatUtcTime } from "../../lib/format";
import { useClock, type ReplayClock, type ReplaySpeed } from "./clock";
import styles from "./ReplayPage.module.css";

const SPEEDS: { value: ReplaySpeed; label: string }[] = [
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 5, label: "5x" },
  { value: 10, label: "10x" },
];

const MARKER_KINDS = new Set<ReplayEvent["kind"]>(["pit", "neutralisation"]);

export function ReplayControls({
  clock,
  model,
}: {
  clock: ReplayClock;
  model: ReplayModel;
}) {
  const { time, playing, speed } = useClock(clock, 10);
  const span = model.endMs - model.startMs;
  const pct = (ms: number) => `${((ms - model.startMs) / span) * 100}%`;
  const lap = raceLapAt(model, time);
  const lapStart = (n: number) =>
    model.leaderLapStarts[Math.min(model.totalLaps, Math.max(1, n)) - 1] ??
    model.startMs;

  return (
    <div className={styles.controls}>
      <div className={styles.controlRow}>
        <Button
          variant="icon"
          className={`${styles.transport} ${styles.skip}`}
          aria-label="Previous lap"
          title="Previous lap"
          onClick={() =>
            clock.seek(lapStart(time - lapStart(lap) < 3000 ? lap - 1 : lap))
          }
        >
          <IconPlayerSkipBack size={15} stroke={1.5} />
        </Button>
        <Button
          variant="primary"
          className={styles.transport}
          onClick={() => clock.toggle()}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <IconPlayerPauseFilled size={15} />
          ) : (
            <IconPlayerPlayFilled size={15} />
          )}
        </Button>
        <Button
          variant="icon"
          className={`${styles.transport} ${styles.skip}`}
          aria-label="Next lap"
          title="Next lap"
          onClick={() => clock.seek(lapStart(lap + 1))}
        >
          <IconPlayerSkipForward size={15} stroke={1.5} />
        </Button>
        <Segmented
          label="Playback speed"
          options={SPEEDS}
          value={speed}
          onChange={(s) => clock.setSpeed(s)}
        />
        <div className={styles.timeline}>
          <div className={styles.timelineTrack} aria-hidden="true">
            {model.periods.map((p) => (
              <span
                key={`${p.kind}${p.startMs}`}
                className={`${styles.band} ${styles[`band${p.kind}`]}`}
                style={{
                  left: pct(p.startMs),
                  width: `calc(${pct(p.endMs ?? model.endMs)} - ${pct(p.startMs)})`,
                }}
                title={p.kind}
              />
            ))}
            {model.events
              .filter((e) => MARKER_KINDS.has(e.kind))
              .map((e) => (
                <span
                  key={e.id}
                  className={styles.tick}
                  style={{ left: pct(e.ms) }}
                />
              ))}
            <span className={styles.progress} style={{ width: pct(time) }} />
          </div>
          <input
            type="range"
            className={styles.scrubber}
            min={model.startMs}
            max={model.endMs}
            step={1000}
            value={time}
            onChange={(event) => clock.seek(Number(event.target.value))}
            aria-label="Replay timeline"
            aria-valuetext={`Lap ${lap}, ${formatClock((time - model.startMs) / 1000)}`}
          />
        </div>
        <div className={styles.readout}>
          <span
            className="tabular"
            title={`${formatUtcTime(new Date(time).toISOString())} UTC`}
          >
            {formatClock((time - model.startMs) / 1000)} /{" "}
            {formatClock(span / 1000)}
          </span>
          <span className="tabular">
            Lap {lap} / {model.totalLaps}
          </span>
        </div>
      </div>
    </div>
  );
}
