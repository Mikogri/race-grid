import { useSearchParams } from 'react-router';
import { IconX } from '@tabler/icons-react';
import { useCircuitIndex } from '../../data/circuits';
import { useAllCircuitSessions } from '../../data/circuitHistory';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import { LapComparison } from './LapComparison';
import { LapPicker } from './LapPicker';
import { MAX_LAPS, parseSpecs, specKey, specsToParam, type LapSpec } from './lapSpecs';
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

  return (
    <>
      <Card
        title="Laps to compare"
        actions={
          <Select
            label="Circuit"
            value={slug}
            placeholder="Choose a circuit…"
            onChange={(next) => update({ circuit: next, specs: [] })}
            options={(circuits.data ?? []).map((c) => ({ value: c.slug, label: c.name }))}
          />
        }
      >
        {!circuit ? (
          <EmptyState title="Choose a circuit first">Compared laps must come from the same circuit; seasons, sessions and drivers can differ.</EmptyState>
        ) : sessions.error ? (
          <ErrorState error={sessions.error} />
        ) : sessions.isPending ? (
          <Skeleton rows={2} />
        ) : !sessions.data?.length ? (
          <EmptyState title="No finished sessions at this circuit in OpenF1" />
        ) : (
          <>
            <LapPicker
              key={circuit.slug}
              sessions={sessions.data}
              disabled={specs.length >= MAX_LAPS}
              onAdd={(spec) => !specs.some((s) => specKey(s) === specKey(spec)) && update({ specs: [...specs, spec] })}
            />
            {specs.length > 0 && (
              <ul className={styles.chips}>
                {specs.map((spec) => {
                  const session = sessionByKey.get(spec.sessionKey);
                  return (
                    <li key={specKey(spec)} className={styles.chip}>
                      {session ? `${session.year} ${session.session_name}` : `Session ${spec.sessionKey}`} · #{spec.driver} · lap {spec.lap}
                      <button type="button" aria-label="Remove lap" onClick={() => update({ specs: specs.filter((s) => specKey(s) !== specKey(spec)) })}>
                        <IconX size={12} stroke={1.5} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Card>
      {circuit && specs.length > 0 && sessions.data && <LapComparison specs={specs} sessionByKey={sessionByKey} />}
    </>
  );
}
