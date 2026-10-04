import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { computeBenchmarks, integrateDistanceKm, type BenchmarkSource } from '../../analytics/benchmarks';
import type { Lap, Session } from '../../api/openf1/types';
import layout from '../../components/layout/PageLayout.module.css';
import { Card, DetailPanel, Panel } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import { TrackOutline } from '../../components/ui/TrackOutline';
import { useCircuitIndex, useCircuitYear } from '../../data/circuits';
import { useCircuitSessions, useMeetingDriversQueries, useSessionsLaps } from '../../data/circuitHistory';
import { useSessionData } from '../../data/sessionData';
import { BenchmarksCard } from './BenchmarksCard';
import { CircuitHistoryTable, type CircuitMeetingRow } from './CircuitHistoryTable';
import { ReferenceLapCard } from './ReferenceLapCard';
import styles from './TrackDetailsPage.module.css';

const SECTOR_OPTIONS = [
  { value: 0, label: 'Full lap' },
  { value: 1, label: 'S1' },
  { value: 2, label: 'S2' },
  { value: 3, label: 'S3' },
];

function maxLapNumber(laps: Lap[] | undefined): number | null {
  if (!laps?.length) return null;
  return Math.max(...laps.map((l) => l.lap_number));
}

export function TrackDetailsPage() {
  const { slug } = useParams();
  const index = useCircuitIndex();
  const circuit = index.data?.find((c) => c.slug === slug);
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const [sector, setSector] = useState(0);
  const year = pickedYear ?? circuit?.outlineYear ?? undefined;
  const geometry = useCircuitYear(circuit?.readyYears.length ? slug : undefined, year);

  const sessions = useCircuitSessions(circuit?.circuitKey);
  const sessionList = useMemo(() => sessions.data ?? [], [sessions.data]);
  const lapsQueries = useSessionsLaps(sessionList);
  const meetingKeys = useMemo(() => [...new Set(sessionList.map((s) => s.meeting_key))], [sessionList]);
  const driversQueries = useMeetingDriversQueries(meetingKeys);

  const reference = geometry.data?.reference;
  const referenceTelemetry = useSessionData(
    'car_data',
    reference ? { session_key: reference.sessionKey, date_end: reference.lapDateStart } : null,
    reference
      ? {
          driver_number: reference.driverNumber,
          'date>=': reference.lapDateStart,
          'date<=': new Date(new Date(reference.lapDateStart).getTime() + reference.lapDuration * 1000).toISOString(),
        }
      : {},
  );
  const lapDistanceKm = useMemo(() => (referenceTelemetry.data ? integrateDistanceKm(referenceTelemetry.data) : null), [referenceTelemetry.data]);

  const lapsBySession = new Map<number, Lap[]>();
  sessionList.forEach((s, i) => {
    const data = lapsQueries[i]?.data;
    if (data) lapsBySession.set(s.session_key, data);
  });
  const acronyms = new Map<string, string>();
  driversQueries.forEach((q) => q.data?.forEach((d) => acronyms.set(`${d.meeting_key}:${d.driver_number}`, d.name_acronym)));

  const loadedLaps = lapsQueries.filter((q) => q.data).length;
  const lapsDone = sessionList.length > 0 && loadedLaps === sessionList.length && driversQueries.every((q) => q.data);
  const lapsError = lapsQueries.find((q) => q.error)?.error ?? driversQueries.find((q) => q.error)?.error;

  const toSource = (session: Session): BenchmarkSource => ({
    year: session.year,
    sessionName: session.session_name,
    laps: lapsBySession.get(session.session_key) ?? [],
    acronymOf: (n) => acronyms.get(`${session.meeting_key}:${n}`) ?? `#${n}`,
  });
  const benchmarks = lapsDone
    ? computeBenchmarks(
        sessionList.filter((s) => s.session_name === 'Qualifying').map(toSource),
        sessionList.filter((s) => s.session_name === 'Race').map(toSource),
      )
    : [];

  const meetings: CircuitMeetingRow[] = meetingKeys.map((meetingKey) => {
    const quali = sessionList.find((s) => s.meeting_key === meetingKey && s.session_name === 'Qualifying');
    const race = sessionList.find((s) => s.meeting_key === meetingKey && s.session_name === 'Race');
    const qualiLaps = quali ? lapsBySession.get(quali.session_key) : undefined;
    const poleLap = qualiLaps?.reduce<number | null>((best, l) => (l.lap_duration && (best === null || l.lap_duration < best) ? l.lap_duration : best), null);
    return {
      meetingKey,
      year: (race ?? quali)?.year ?? 0,
      date: (race ?? quali)?.date_start ?? '',
      race: race ?? null,
      fastestQualifyingLap: poleLap ?? null,
      raceLaps: race ? maxLapNumber(lapsBySession.get(race.session_key)) : null,
      loading: !lapsDone,
    };
  });
  const latestRaceLaps = [...meetings].reverse().find((m) => m.raceLaps !== null)?.raceLaps ?? null;

  if (index.error) return <ErrorState error={index.error} onRetry={() => void index.refetch()} />;
  if (index.isPending) return <Skeleton rows={8} />;
  if (!circuit) return <EmptyState title="Unknown circuit">This circuit is not in the local circuit library.</EmptyState>;

  const meeting = geometry.data?.meeting ?? circuit.meeting;
  return (
    <>
      <PageHeader
        back={{ to: '/tracks', label: 'Back to tracks' }}
        title={circuit.name}
        meta={[
          { label: 'Location', value: meeting ? `${meeting.location}, ${meeting.countryName}` : '—' },
          { label: 'Type', value: meeting?.circuitType ?? '—' },
          { label: 'Race laps', value: latestRaceLaps ?? '—' },
          {
            label: 'Lap distance ≈',
            value: lapDistanceKm ? `${lapDistanceKm.toFixed(2)} km` : referenceTelemetry.isFetching ? '…' : '—',
          },
          { label: 'Turns', value: '—' },
        ]}
      />
      <div className={layout.withPanel}>
        <Panel>
          <Card
            title="Circuit map"
            actions={
              <>
                <Segmented label="Highlight sector" options={SECTOR_OPTIONS} value={sector} onChange={setSector} />
                {circuit.readyYears.length > 1 && (
                  <Segmented
                    label="Outline season"
                    options={circuit.readyYears.map((y) => ({ value: y, label: String(y) }))}
                    value={year ?? 0}
                    onChange={setPickedYear}
                  />
                )}
              </>
            }
          >
            {circuit.readyYears.length === 0 ? (
              <EmptyState title="No local outline for this circuit">
                The local circuit library has no finished OpenF1 session here yet ({circuit.years.map((y) => `${y.year}: ${y.status.replace(/_/g, ' ')}`).join(', ')}).
              </EmptyState>
            ) : geometry.error ? (
              <ErrorState error={geometry.error} />
            ) : geometry.data ? (
              <div className={styles.map}>
                <TrackOutline
                  outline={geometry.data.outline}
                  sectors={geometry.data.sectors}
                  highlightSector={sector || null}
                  startGate={geometry.data.gates.find((g) => g.type === 'START') ?? null}
                  title={`${circuit.name} ${year} outline with timing sectors`}
                />
              </div>
            ) : (
              <Skeleton rows={1} height="520px" />
            )}
            <p className={layout.note}>
              Outline = approximate trajectory of one reference lap from OpenF1 location data, not surveyed track edges. A surrounding city map
              is not shown: OpenF1 coordinates are not geo-referenced, so any street map overlay would be guesswork. Turn count is not
              available in OpenF1 or the local library. Lap distance is derived by integrating the reference lap's speed telemetry.
            </p>
          </Card>
          <CircuitHistoryTable rows={meetings} loading={sessions.isPending} error={sessions.error} />
        </Panel>
        <DetailPanel className={layout.panel}>
          <BenchmarksCard
            benchmarks={benchmarks}
            loading={!lapsDone && !lapsError && (sessions.isPending || sessionList.length > 0)}
            progress={{ done: loadedLaps, total: sessionList.length }}
            error={lapsError}
            seasons={[...new Set(sessionList.map((s) => s.year))]}
          />
          {geometry.data && <ReferenceLapCard circuitYear={geometry.data} />}
        </DetailPanel>
      </div>
    </>
  );
}
