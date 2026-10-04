import { useState } from 'react';
import type { ReplayEvent, ReplayEventKind, ReplayModel } from '../../analytics/replay/model';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Segmented } from '../../components/ui/Segmented';
import { EmptyState } from '../../components/ui/StateViews';
import { formatClock } from '../../lib/format';
import { useClock, type ReplayClock } from './clock';
import styles from './ReplayPage.module.css';

type Filter = 'all' | 'overtake' | 'pit' | 'flags' | 'radio' | 'driver';

const TONE: Record<ReplayEventKind, BadgeTone> = {
  overtake: 'success',
  pit: 'info',
  flag: 'warning',
  neutralisation: 'warning',
  control: 'neutral',
  radio: 'neutral',
};

const LABEL: Record<ReplayEventKind, string> = {
  overtake: 'Overtake',
  pit: 'Pit',
  flag: 'Flag',
  neutralisation: 'SC / VSC',
  control: 'Race control',
  radio: 'Radio',
};

function matches(event: ReplayEvent, filter: Filter, driver: number): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'flags':
      return event.kind === 'flag' || event.kind === 'neutralisation' || event.kind === 'control';
    case 'driver':
      return event.drivers.includes(driver);
    default:
      return event.kind === filter;
  }
}

/** Seek a little before the event so its build-up is visible. */
const LEAD_MS = 4000;

export function EventsPanel({ clock, model, driverNumber }: { clock: ReplayClock; model: ReplayModel; driverNumber: number }) {
  const { time } = useClock(clock, 2);
  const [filter, setFilter] = useState<Filter>('all');
  // Race order: first event at the top.
  const events = model.events.filter((e) => matches(e, filter, driverNumber)).sort((a, b) => a.ms - b.ms);

  return (
    <div className={styles.events}>
      <Segmented
        label="Event filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'overtake', label: 'Overtakes' },
          { value: 'pit', label: 'Pit stops' },
          { value: 'flags', label: 'Flags & control' },
          { value: 'radio', label: 'Radio' },
          { value: 'driver', label: 'Selected driver' },
        ]}
      />
      {events.length === 0 ? (
        <EmptyState title="No events for this filter" />
      ) : (
        <ol className={styles.eventList}>
          {events.map((event) => (
            <li key={event.id} className={event.ms > time ? styles.futureEvent : undefined}>
              <button type="button" className={styles.eventButton} onClick={() => clock.seek(Math.max(model.startMs, event.ms - LEAD_MS))}>
                <span className={`${styles.eventTime} mono`}>{event.ms >= model.startMs ? formatClock((event.ms - model.startMs) / 1000) : 'pre'}</span>
                <span className={styles.eventLap}>{event.lap ? `L${event.lap}` : ''}</span>
                <Badge tone={TONE[event.kind]}>{LABEL[event.kind]}</Badge>
                <span className={styles.eventTitle}>
                  {event.title}
                  {event.detail && <span className={styles.eventDetail}> · {event.detail}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
