import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { IconX } from '@tabler/icons-react';
import type { Session } from '../../api/openf1/types';
import { useCircuitIndex } from '../../data/circuits';
import { useAllCircuitSessions } from '../../data/circuitHistory';
import { useSessionData } from '../../data/sessionData';
import { LineChart } from '../../components/charts/LineChart';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import { TeamMarker } from '../../components/ui/TeamMarker';
import { formatLapTime } from '../../lib/format';
import { UNKNOWN_TEAM_COLOR } from '../../lib/teams';
import { LapComparison } from './LapComparison';
import { LapPicker } from './LapPicker';
import { MAX_LAPS, TRACE_COLORS, parseSpecs, specKey, specsToParam, type LapSpec } from './lapSpecs';
import styles from './Compare.module.css';

/** Laps from any season, session and driver — but always on the same circuit. */
export function LapCompare() {
  const [params, setParams] = useSearchParams();
  const circuits = useCircuitIndex();
  const slug = params.get('circuit');
  const circuit = circuits.data?.find((c) => c.slug === slug);
  const sessions = useAllCircuitSessions(circuit?.circuitKey);
  const specs = parseSpecs(params.get('laps'));
  const sessionByKey = new Map((sessions.data ?? []).map((s) => [s.session_key, s]));

  const update = (next: { circuit?: string; specs?: LapSpec[] }) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('mode', 'lap');
      if (next.circuit !== undefined) p.set('circuit', next.circuit);
      if (next.specs !== undefined) {
        if (next.specs.length) p.set('laps', specsToParam(next.specs));
        else p.delete('laps');
      }
      return p;
    });

  if (circuits.error) return <ErrorState error={circuits.error} />;
  if (circuits.isPending) return <Skeleton rows={4} />;

  const circuitSelect = (
    <Select
      label="Circuit"
      value={slug}
      placeholder="Choose a circuit…"
      onChange={(next) => update({ circuit: next, specs: [] })}
      options={(circuits.data ?? []).map((c) => ({ value: c.slug, label: c.name }))}
      className={circuit ? undefined : styles.wide}
    />
  );

  return (
    <>
      <Card
        title={circuit ? `Laps at ${circuit.name}` : 'Laps to compare'}
        description={`Up to ${MAX_LAPS} laps from one circuit: any season, session or driver. The first lap is the reference.`}
        actions={circuit ? circuitSelect : undefined}
      >
        {!circuit ? (
          <ol className={styles.steps}>
            <li className={styles.step}>
              <span className={styles.stepIndex}>01</span>
              <p className={styles.stepTitle}>Choose a circuit</p>
              {circuitSelect}
            </li>
            <li className={styles.step}>
              <span className={styles.stepIndex}>02</span>
              <p className={styles.stepTitle}>Add up to {MAX_LAPS} laps</p>
              <p className={styles.stepText}>Pick the season, session, driver and lap for each slot.</p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepIndex}>03</span>
              <p className={styles.stepTitle}>Read the overlay</p>
              <p className={styles.stepText}>Time delta, speed, throttle, brake and gear along the lap.</p>
            </li>
          </ol>
        ) : sessions.error ? (
          <ErrorState error={sessions.error} />
        ) : sessions.isPending ? (
          <Skeleton rows={2} />
        ) : !sessions.data?.length ? (
          <EmptyState title="No finished sessions at this circuit in OpenF1" />
        ) : (
          <ol className={styles.slots}>
            {specs.map((spec, i) => (
              <LapSlot
                key={specKey(spec)}
                index={i}
                spec={spec}
                session={sessionByKey.get(spec.sessionKey)}
                onRemove={() => update({ specs: specs.filter((s) => specKey(s) !== specKey(spec)) })}
              />
            ))}
            {specs.length < MAX_LAPS && (
              <li className={`${styles.slot} ${styles.addSlot}`}>
                <p className={styles.slotIndex}>Add lap {specs.length + 1}</p>
                <LapPicker
                  key={circuit.slug}
                  sessions={sessions.data}
                  onAdd={(spec) => !specs.some((s) => specKey(s) === specKey(spec)) && update({ specs: [...specs, spec] })}
                />
              </li>
            )}
            {Array.from({ length: Math.max(0, MAX_LAPS - specs.length - 1) }, (_, i) => (
              <li key={i} className={`${styles.slot} ${styles.freeSlot}`}>
                <p className={styles.slotIndex}>Lap {specs.length + i + 2}</p>
                <p className={styles.stepText}>Free slot</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
      {circuit && specs.length > 0 && sessions.data ? (
        <LapComparison specs={specs} sessionByKey={sessionByKey} />
      ) : (
        <Card title="Telemetry overlay">
          <div className={styles.ghost}>
            <LineChart label="Empty telemetry overlay" series={[]} height={260} xDomain={[0, 100]} yDomain={[0, 350]} formatX={(x) => `${Math.round(x)}%`} />
            <p className={styles.ghostText}>{circuit ? 'Add a lap to draw its telemetry here.' : 'Choose a circuit to start.'}</p>
          </div>
        </Card>
      )}
    </>
  );
}

/** A chosen lap: trace colour on top, driver, session and lap time. */
function LapSlot({ index, spec, session, onRemove }: { index: number; spec: LapSpec; session: Session | undefined; onRemove: () => void }) {
  const drivers = useSessionData('drivers', session);
  const laps = useSessionData('laps', session, { driver_number: spec.driver });
  const driver = drivers.data?.find((d) => d.driver_number === spec.driver);
  const lap = laps.data?.find((l) => l.lap_number === spec.lap);
  const color = TRACE_COLORS[index % TRACE_COLORS.length];

  return (
    <li className={`${styles.slot} ${styles.filledSlot}`} style={{ '--trace': color } as CSSProperties}>
      <div className={styles.slotHead}>
        <p className={styles.slotIndex}>
          Lap {index + 1}
          {index === 0 && ' · reference'}
        </p>
        <button type="button" className={styles.slotRemove} aria-label={`Remove lap ${index + 1}`} onClick={onRemove}>
          <IconX size={14} stroke={1.5} aria-hidden="true" />
        </button>
      </div>
      <p className={styles.slotDriver}>
        <TeamMarker color={driver?.team_colour ? `#${driver.team_colour}` : UNKNOWN_TEAM_COLOR} />
        {driver?.name_acronym ?? `#${spec.driver}`}
        <span>{driver?.last_name ?? ''}</span>
      </p>
      <p className={styles.stepText}>{session ? `${session.year} ${session.session_name}` : `Session ${spec.sessionKey}`}</p>
      <p className={styles.slotTime}>
        <span>Lap {spec.lap}</span>
        <span>{formatLapTime(lap?.lap_duration)}</span>
      </p>
    </li>
  );
}
