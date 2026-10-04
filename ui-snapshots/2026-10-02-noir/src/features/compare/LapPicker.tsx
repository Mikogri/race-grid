import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import type { Session } from '../../api/openf1/types';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useSessionData } from '../../data/sessionData';
import { formatLapTime } from '../../lib/format';
import type { LapSpec } from './lapSpecs';
import styles from './Compare.module.css';

/** Year → session → driver → lap, stacked in the next free slot. Every option comes from OpenF1 for this circuit. */
export function LapPicker({ sessions, onAdd }: { sessions: Session[]; onAdd: (spec: LapSpec) => void }) {
  const years = [...new Set(sessions.map((s) => s.year))].sort((a, b) => b - a);
  const [year, setYear] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [driver, setDriver] = useState<number | null>(null);
  const [lapNumber, setLapNumber] = useState<number | null>(null);

  const activeYear = year ?? years[0] ?? null;
  const yearSessions = sessions.filter((s) => s.year === activeYear);
  const session = yearSessions.find((s) => s.session_key === sessionKey) ?? [...yearSessions].reverse().find((s) => s.session_name === 'Qualifying') ?? yearSessions[0];
  const drivers = useSessionData('drivers', session);
  const driverList = [...new Map((drivers.data ?? []).map((d) => [d.driver_number, d])).values()].sort((a, b) => a.name_acronym.localeCompare(b.name_acronym));
  const activeDriver = driver ?? driverList[0]?.driver_number ?? null;
  const laps = useSessionData('laps', activeDriver !== null ? session : null, { driver_number: activeDriver ?? 0 });
  const timed = (laps.data ?? []).filter((l) => l.lap_duration).sort((a, b) => (a.lap_duration ?? 0) - (b.lap_duration ?? 0));
  const activeLap = lapNumber ?? timed[0]?.lap_number ?? null;

  const reset = (level: 'year' | 'session' | 'driver') => {
    if (level === 'year') setSessionKey(null);
    if (level !== 'driver') setDriver(null);
    setLapNumber(null);
  };

  return (
    <div className={styles.picker}>
      <Select
        label="Season"
        showLabel
        value={activeYear}
        onChange={(y) => {
          setYear(y);
          reset('year');
        }}
        options={years.map((y) => ({ value: y, label: String(y) }))}
      />
      <Select
        label="Session"
        showLabel
        value={session?.session_key ?? null}
        onChange={(key) => {
          setSessionKey(key);
          reset('session');
        }}
        options={yearSessions.map((s) => ({ value: s.session_key, label: s.session_name }))}
      />
      <Select
        label="Driver"
        showLabel
        value={activeDriver}
        onChange={(d) => {
          setDriver(d);
          reset('driver');
        }}
        disabled={!driverList.length}
        options={driverList.map((d) => ({ value: d.driver_number, label: `${d.name_acronym} · ${d.last_name ?? d.full_name}` }))}
      />
      <Select
        label="Lap"
        showLabel
        value={activeLap}
        onChange={setLapNumber}
        disabled={!timed.length}
        options={timed.map((l, i) => ({ value: l.lap_number, label: `Lap ${l.lap_number} · ${formatLapTime(l.lap_duration)}${i === 0 ? ' (fastest)' : ''}` }))}
      />
      <Button
        variant="primary"
        className={styles.addButton}
        icon={<IconPlus size={14} stroke={1.5} aria-hidden="true" />}
        disabled={!session || activeDriver === null || activeLap === null}
        onClick={() => session && activeDriver !== null && activeLap !== null && onAdd({ sessionKey: session.session_key, driver: activeDriver, lap: activeLap })}
      >
        Add lap
      </Button>
    </div>
  );
}
