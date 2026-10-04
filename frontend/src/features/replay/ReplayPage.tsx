import { useParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { TrackOutline } from '../../components/ui/TrackOutline';
import { squareFrame } from '../../lib/trackFrame';
import { AnalysisLoader, EmptyState, ErrorState } from '../../components/ui/StateViews';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { useCircuitsByKey, useCircuitYear } from '../../data/circuits';
import { formatDate } from '../../lib/format';
import styles from './ReplayPage.module.css';
import { ReplayView } from './ReplayView';
import { useReplayModel, useReplaySession } from './useReplayData';

export function ReplayPage() {
  const sessionKey = Number(useParams().sessionKey);
  const session = useReplaySession(sessionKey);
  const circuits = useCircuitsByKey();
  const circuit = session.data ? circuits.byKey.get(session.data.circuit_key) : undefined;
  const year = session.data?.year;
  const hasLocalYear = Boolean(circuit && year && circuit.readyYears.includes(year));
  const geometry = useCircuitYear(hasLocalYear ? circuit?.slug : undefined, year);
  const { model, progress, error, retry } = useReplayModel(session.data);

  if (session.error) return <ErrorState error={session.error} onRetry={() => void session.refetch()} />;
  if (session.isPending || circuits.isPending) return <PageSkeleton layout="replay" />;
  if (!session.data) return <EmptyState title="Unknown session">OpenF1 has no session with key {sessionKey}.</EmptyState>;
  if (session.data.session_type !== 'Race') {
    return <EmptyState title="Replay is available for races and sprints">This session is {session.data.session_name}.</EmptyState>;
  }

  const s = session.data;
  // Header thumbnail: rotated so the circuit fits its square tile (longest extent on the diagonal).
  const thumbFrame = circuit?.outline ? squareFrame(circuit.outline) : null;
  const thumb =
    circuit?.outline && thumbFrame
      ? {
          outline: circuit.outline,
          frame: thumbFrame,
          viewBox: `${thumbFrame.viewBox.x} ${thumbFrame.viewBox.y} ${thumbFrame.viewBox.width} ${thumbFrame.viewBox.height}`,
        }
      : null;
  const header = (
    <PageHeader
      boxed
      crumbs={[{ to: '/replay', label: 'Race Replay' }, { to: `/rounds/${s.meeting_key}`, label: s.location }]}
      leading={thumb ? <TrackOutline outline={thumb.outline} variant="thumb" viewBox={thumb.viewBox} rotation={thumb.frame} title={`${s.circuit_short_name} outline`} /> : undefined}
      title={
        <>
          <mark>{s.location}</mark> {s.session_name} Replay
        </>
      }
      meta={[
        { label: 'Circuit', value: `${s.circuit_short_name}, ${s.country_name}` },
        { label: 'Date', value: formatDate(s.date_start) },
        { label: 'Laps', value: model?.totalLaps ?? '—' },
        { label: 'Outline', value: hasLocalYear ? `Local ${year}` : 'Reconstructed' },
      ]}
    />
  );

  if (error) {
    return (
      <>
        {header}
        <Card>
          <ErrorState error={error} onRetry={retry} title="Replay data could not be loaded" />
        </Card>
      </>
    );
  }

  const geometryPending = hasLocalYear && geometry.isPending;
  if (!model || geometryPending) {
    const ready = progress.done === progress.total;
    return (
      <>
        {header}
        <Card>
          {ready && !model && !geometryPending ? (
            <EmptyState title="This race has no lap timing in OpenF1">Without lap data the replay timeline cannot be reconstructed.</EmptyState>
          ) : (
            <AnalysisLoader title="Preparing race replay" progress={progress} />
          )}
        </Card>
      </>
    );
  }

  return (
    <div className={styles.page}>
      {header}
      <ReplayView key={sessionKey} model={model} geometry={geometry.data ?? null} />
    </div>
  );
}
