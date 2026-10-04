import type { Benchmark } from '../../analytics/benchmarks';
import { Card } from '../../components/ui/Card';
import { AnalysisLoader, EmptyState, ErrorState } from '../../components/ui/StateViews';
import { formatLapTime } from '../../lib/format';
import styles from './TrackDetailsPage.module.css';

interface BenchmarksCardProps {
  benchmarks: Benchmark[];
  loading: boolean;
  progress: { done: number; total: number };
  error: unknown;
  seasons: number[];
}

export function BenchmarksCard({ benchmarks, loading, progress, error, seasons }: BenchmarksCardProps) {
  const range = seasons.length ? `${Math.min(...seasons)}–${Math.max(...seasons)}` : '';
  return (
    <Card title="RaceGrid Benchmarks">
      {error ? (
        <ErrorState error={error} />
      ) : loading ? (
        <AnalysisLoader title="Scanning laps" progress={progress} />
      ) : benchmarks.length === 0 ? (
        <EmptyState title="No finished sessions in OpenF1 for this circuit" />
      ) : (
        <>
          <ul className={styles.benchmarks}>
            {benchmarks.map((b) => (
              <li key={b.label}>
                <span className={styles.benchmarkLabel}>{b.label}</span>
                <span className={styles.benchmarkValue}>{b.unit === 'time' ? formatLapTime(b.value) : `${b.value} km/h`}</span>
                <span className={styles.benchmarkMeta}>
                  {b.driver} · {b.year} {b.sessionName} · lap {b.lapNumber}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.caption}>
            Best values within OpenF1 data {range} (qualifying and race sessions only). Not official lap records. Speed = highest of the
            intermediate and speed-trap readings.
          </p>
        </>
      )}
    </Card>
  );
}
