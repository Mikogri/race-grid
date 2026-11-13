import { labelFor } from "../../analytics/drivers";
import type { ReplayModel } from "../../analytics/replay/model";
import { EmptyState } from "../../components/ui/StateViews";
import { DriverTag } from "../../components/ui/TeamMarker";
import { formatClock } from "../../lib/format";
import { toMs } from "../../lib/stats";
import type { ReplayClock } from "./clock";
import styles from "./ReplayPage.module.css";

/** OpenF1 team_radio recordings. Only real recordings are listed — nothing is generated. */
export function RadioPanel({
  clock,
  model,
}: {
  clock: ReplayClock;
  model: ReplayModel;
}) {
  // Newest first.
  const radio = [...model.raw.radio].sort(
    (a, b) => toMs(b.date) - toMs(a.date),
  );
  if (radio.length === 0) {
    return (
      <EmptyState title="No team radio in OpenF1 for this session">
        OpenF1 publishes only a selection of broadcast radio clips, and none for
        this race.
      </EmptyState>
    );
  }
  return (
    <ol className={styles.radioList}>
      {radio.map((clip) => {
        const driver = labelFor(model.lookup, clip.driver_number);
        const ms = toMs(clip.date);
        return (
          <li key={clip.recording_url} className={styles.radioItem}>
            <DriverTag acronym={driver.acronym} color={driver.color} />
            <button
              type="button"
              className={styles.jump}
              onClick={() => clock.seek(Math.max(model.startMs, ms - 2000))}
            >
              {ms >= model.startMs
                ? formatClock((ms - model.startMs) / 1000)
                : "Before start"}{" "}
              · jump
            </button>
            <audio
              controls
              preload="none"
              src={clip.recording_url}
              className={styles.audio}
            >
              <a href={clip.recording_url}>Download clip</a>
            </audio>
          </li>
        );
      })}
    </ol>
  );
}
