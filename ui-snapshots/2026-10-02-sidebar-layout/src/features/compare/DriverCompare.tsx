import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { alignEvents, metricsFor, type CompareMetrics, type CompareSide } from '../../analytics/driverCompare';
import { headToHead } from '../../analytics/driverStats';
import { MIN_PACE_LAPS } from '../../analytics/performance';
import { fieldBestByRound, qualifyingGapPercent } from '../../analytics/qualifying';
import type { DriverRoundResult, SeasonModel } from '../../analytics/season';
import { SEASONS } from '../../app/seasons';
import { AnalysisBanner } from '../../components/AnalysisBanner';
import { LineChart } from '../../components/charts/LineChart';
import layout from '../../components/layout/PageLayout.module.css';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import { DriverTag } from '../../components/ui/TeamMarker';
import { useRacePace, type RacePaceByRound } from '../../data/seasonPace';
import { useSeason } from '../../data/season';
import { formatPoints } from '../../lib/format';
import styles from './Compare.module.css';

const COLORS = { a: 'var(--chart-1)', b: 'var(--chart-2)' };

function parseSide(value: string | null, fallbackYear: number): { year: number; driver: number | null } {
  const [year, driver] = (value ?? '').split('-').map(Number);
  return { year: SEASONS.includes(year) ? year : fallbackYear, driver: Number.isFinite(driver) && driver > 0 ? driver : null };
}

function paceGaps(pace: RacePaceByRound, results: DriverRoundResult[]): number[] {
  return results
    .map((r) => {
      const round = pace.get(r.round);
      const own = round?.get(r.driverNumber);
      if (!round || !own || own.laps < MIN_PACE_LAPS) return null;
      const best = Math.min(...[...round.values()].filter((p) => p.laps >= MIN_PACE_LAPS).map((p) => p.median));
      return ((own.median - best) / best) * 100;
    })
    .filter((g): g is number => g !== null);
}

export function DriverCompare() {
  const [params, setParams] = useSearchParams();
  const a = parseSide(params.get('a'), SEASONS[0]);
  const b = parseSide(params.get('b'), SEASONS[0]);
  const seasonA = useSeason(a.year);
  const seasonB = useSeason(b.year);
  const [commonOnly, setCommonOnly] = useState(true);
  const [loadPace, setLoadPace] = useState(false);

  const setSide = (side: 'a' | 'b', year: number, driver: number | null) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('mode', 'driver');
      p.set(side, `${year}-${driver ?? ''}`);
      return p;
    });

  const sA = seasonA.season;
  const sB = seasonB.season;
  const driverA = a.driver ?? sA?.driverStandings[0]?.driverNumber ?? null;
  const driverB = b.driver ?? sB?.driverStandings[1]?.driverNumber ?? null;
  const sideA: CompareSide | null = sA && driverA !== null ? { season: sA, driverNumber: driverA } : null;
  const sideB: CompareSide | null = sB && driverB !== null ? { season: sB, driverNumber: driverB } : null;
  const events = sideA && sideB ? alignEvents(sideA, sideB, commonOnly) : [];
  const resultsA = events.map((e) => e.a).filter((r): r is DriverRoundResult => r !== null);
  const resultsB = events.map((e) => e.b).filter((r): r is DriverRoundResult => r !== null);

  const roundsA = sA?.completedRounds.filter((r) => resultsA.some((x) => x.round === r.round)) ?? [];
  const roundsB = sB?.completedRounds.filter((r) => resultsB.some((x) => x.round === r.round)) ?? [];
  const paceA = useRacePace(roundsA, loadPace);
  const paceB = useRacePace(roundsB, loadPace);
  const paceReady = loadPace && paceA.complete && paceB.complete;

  const error = seasonA.error ?? seasonB.error;
  if (error) return <ErrorState error={error} />;

  const mA = sA && sideA ? metricsFor(sA, resultsA, paceReady ? paceGaps(paceA.pace, resultsA) : null) : null;
  const mB = sB && sideB ? metricsFor(sB, resultsB, paceReady ? paceGaps(paceB.pace, resultsB) : null) : null;
  const infoA = sideA ? sA?.drivers.get(sideA.driverNumber) : undefined;
  const infoB = sideB ? sB?.drivers.get(sideB.driverNumber) : undefined;
  const h2h = sA && sB && sA.year === sB.year && sideA && sideB ? headToHead(resultsA, resultsB) : null;

  return (
    <>
      <Card title="Drivers">
        <div className={styles.pickers}>
          <SidePicker label="Driver A" season={sA} year={a.year} driver={driverA} onChange={(y, d) => setSide('a', y, d)} />
          <SidePicker label="Driver B" season={sB} year={b.year} driver={driverB} onChange={(y, d) => setSide('b', y, d)} />
        </div>
        <div className={`${styles.toolbar} ${styles.spaced}`}>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={commonOnly} onChange={(e) => setCommonOnly(e.target.checked)} />
            {a.year === b.year ? 'Common events only' : 'Common circuits only'}
          </label>
          <span>{events.length} events compared</span>
          {!loadPace && (
            <Button variant="ghost" onClick={() => setLoadPace(true)}>
              Load race pace ({new Set([...roundsA, ...roundsB].map((r) => r.race?.session_key)).size} races)
            </Button>
          )}
        </div>
      </Card>
      {loadPace && !paceReady && (
        <AnalysisBanner progress={{ done: paceA.progress.done + paceB.progress.done, total: paceA.progress.total + paceB.progress.total }} />
      )}
      {!sA || !sB ? (
        <Skeleton rows={8} />
      ) : !mA || !mB || !infoA || !infoB ? (
        <EmptyState title="Pick two drivers" />
      ) : (
        <div className={layout.withPanel}>
          <div className={layout.stack}>
            <Card title="Finishing position by event">
              <LineChart
                label="Finishing positions of both drivers"
                series={[
                  { id: 'a', label: `${infoA.acronym} ${a.year}`, color: COLORS.a, points: events.map((e, i) => ({ x: i + 1, y: e.a?.finish ?? NaN })).filter((p) => Number.isFinite(p.y)) },
                  { id: 'b', label: `${infoB.acronym} ${b.year}`, color: COLORS.b, points: events.map((e, i) => ({ x: i + 1, y: e.b?.finish ?? NaN })).filter((p) => Number.isFinite(p.y)) },
                ]}
                yReversed
                yDomain={[1, 20]}
                yTicks={[1, 5, 10, 15, 20]}
                formatX={(x) => events[Math.round(x) - 1]?.label ?? ''}
                formatY={(y) => `P${Math.round(y)}`}
                markers
              />
            </Card>
            <Card title="Qualifying gap to fastest lap (%)">
              <QualiChart events={events} sA={sA} sB={sB} labelA={`${infoA.acronym} ${a.year}`} labelB={`${infoB.acronym} ${b.year}`} />
            </Card>
          </div>
          <div className={layout.panel}>
            <Card title="Comparison">
              <div className={`${styles.metricRow} ${styles.metricHead}`}>
                <DriverTag acronym={`${infoA.acronym} ${a.year}`} color={infoA.color} />
                <span className={styles.metricLabel}>vs</span>
                <DriverTag acronym={`${infoB.acronym} ${b.year}`} color={infoB.color} />
              </div>
              <MetricRows a={mA} b={mB} />
              {h2h && (
                <>
                  <Row label="Qualifying H2H" a={String(h2h.qualifyingA)} b={String(h2h.qualifyingB)} better={Math.sign(h2h.qualifyingA - h2h.qualifyingB)} />
                  <Row label="Race H2H" a={String(h2h.raceA)} b={String(h2h.raceB)} better={Math.sign(h2h.raceA - h2h.raceB)} />
                </>
              )}
              <p className={`${styles.toolbar} ${styles.spaced}`}>
                Based on the {events.length} events shown. Race pace = median clean race lap vs the fastest driver of each race (RaceGrid derived).
              </p>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function SidePicker({ label, season, year, driver, onChange }: { label: string; season: SeasonModel | undefined; year: number; driver: number | null; onChange: (year: number, driver: number | null) => void }) {
  return (
    <div>
      <p className={styles.sideLabel}>{label}</p>
      <div className={styles.pickerSide}>
        <Select
          label={`${label} season`}
          value={year}
          onChange={(y) => onChange(y, null)}
          options={SEASONS.map((y) => ({ value: y, label: String(y) }))}
        />
        <Select
          label={`${label} driver`}
          value={driver}
          onChange={(d) => onChange(year, d)}
          disabled={!season}
          options={(season?.driverStandings ?? []).map((s) => ({
            value: s.driverNumber,
            label: `${season?.drivers.get(s.driverNumber)?.fullName ?? `#${s.driverNumber}`} · P${s.position ?? '—'}`,
          }))}
        />
      </div>
    </div>
  );
}

function QualiChart({ events, sA, sB, labelA, labelB }: { events: ReturnType<typeof alignEvents>; sA: SeasonModel; sB: SeasonModel; labelA: string; labelB: string }) {
  const gapA = metricsSeries(sA, events.map((e) => e.a));
  const gapB = metricsSeries(sB, events.map((e) => e.b));
  return (
    <LineChart
      label="Qualifying gap of both drivers"
      series={[
        { id: 'a', label: labelA, color: COLORS.a, points: gapA },
        { id: 'b', label: labelB, color: COLORS.b, points: gapB },
      ]}
      yReversed
      formatX={(x) => events[Math.round(x) - 1]?.label ?? ''}
      formatY={(y) => `${y.toFixed(2)}%`}
      markers
    />
  );
}

function metricsSeries(season: SeasonModel, results: (DriverRoundResult | null)[]) {
  const fieldBest = fieldBestByRound(season);
  return results
    .map((r, i) => (r ? { x: i + 1, y: qualifyingGapPercent(r, fieldBest) } : null))
    .filter((p): p is { x: number; y: number } => p !== null && p.y !== null);
}

function Row({ label, a, b, better }: { label: string; a: string; b: string; better: number }) {
  return (
    <div className={styles.metricRow}>
      <span className={better > 0 ? styles.metricBetter : styles.metricValue}>{a}</span>
      <span className={styles.metricLabel}>{label}</span>
      <span className={better < 0 ? styles.metricBetter : styles.metricValue}>{b}</span>
    </div>
  );
}

/** better: +1 = A better, −1 = B better, 0 = equal/unknown. */
function MetricRows({ a, b }: { a: CompareMetrics; b: CompareMetrics }) {
  const higher = (x: number | null, y: number | null) => (x === null || y === null ? 0 : Math.sign(x - y));
  const lower = (x: number | null, y: number | null) => -higher(x, y);
  const num = (v: number | null, digits = 1) => (v === null ? '—' : v.toFixed(digits));
  const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(2)}%`);
  return (
    <>
      <Row label="Events" a={String(a.events)} b={String(b.events)} better={0} />
      <Row label="Points" a={formatPoints(a.points)} b={formatPoints(b.points)} better={higher(a.points, b.points)} />
      <Row label="Points / event" a={num(a.pointsPerEvent)} b={num(b.pointsPerEvent)} better={higher(a.pointsPerEvent, b.pointsPerEvent)} />
      <Row label="Wins" a={String(a.wins)} b={String(b.wins)} better={higher(a.wins, b.wins)} />
      <Row label="Podiums" a={String(a.podiums)} b={String(b.podiums)} better={higher(a.podiums, b.podiums)} />
      <Row label="Poles" a={String(a.poles)} b={String(b.poles)} better={higher(a.poles, b.poles)} />
      <Row label="Median grid" a={num(a.medianGrid)} b={num(b.medianGrid)} better={lower(a.medianGrid, b.medianGrid)} />
      <Row label="Median finish" a={num(a.medianFinish)} b={num(b.medianFinish)} better={lower(a.medianFinish, b.medianFinish)} />
      <Row label="Avg. positions gained" a={num(a.avgGained)} b={num(b.avgGained)} better={higher(a.avgGained, b.avgGained)} />
      <Row label="Qualifying gap" a={pct(a.qualifyingGap)} b={pct(b.qualifyingGap)} better={lower(a.qualifyingGap, b.qualifyingGap)} />
      <Row label="Race pace gap" a={pct(a.racePaceGap)} b={pct(b.racePaceGap)} better={lower(a.racePaceGap, b.racePaceGap)} />
      <Row label="Consistency (σ finish)" a={num(a.consistency, 2)} b={num(b.consistency, 2)} better={lower(a.consistency, b.consistency)} />
      <Row label="DNFs" a={String(a.dnf)} b={String(b.dnf)} better={lower(a.dnf, b.dnf)} />
    </>
  );
}
