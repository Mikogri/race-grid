import type { ReactNode } from 'react';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { OpenF1Error } from '../../api/openf1/client';
import { Button } from './Button';
import { ThinkingOrb } from './ThinkingOrb';
import { useInCard } from './cardContext';
import styles from './StateViews.module.css';

/** Outside a Card every state renders as its own panel, so nothing sits directly on the page background. */
function usePanelClass(base: string) {
  return useInCard() ? base : `${base} ${styles.panel}`;
}

/** Plain skeleton for ordinary requests (lists, tables): bars on the 40 px table-row rhythm. */
export function Skeleton({ rows = 6, height = 'var(--space-6)' }: { rows?: number; height?: string }) {
  const className = usePanelClass(styles.skeleton);
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.skeletonRow} style={{ height }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  const className = usePanelClass(styles.state);
  return (
    <div className={className}>
      <p className={styles.title}>{title}</p>
      {children && <div className={styles.text}>{children}</div>}
    </div>
  );
}

function describe(error: unknown): string {
  if (error instanceof OpenF1Error && error.status === 429) {
    return 'OpenF1 rate limit reached. Requests resume automatically — retry in a minute.';
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export function ErrorState({ error, onRetry, title = 'Could not load data' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const className = usePanelClass(styles.state);
  return (
    <div className={className} role="alert">
      <p className={styles.title}>
        <IconAlertTriangle size={16} stroke={1.5} aria-hidden="true" className={styles.errorIcon} />
        {title}
      </p>
      <p className={styles.text}>{describe(error)}</p>
      {onRetry && (
        <Button className={styles.retry} onClick={onRetry} icon={<IconRefresh size={14} stroke={1.5} aria-hidden="true" />}>
          Retry
        </Button>
      )}
    </div>
  );
}

/** Heavy-processing state (replay preparation, analysis). The only place the thinking orb is used. */
export function AnalysisLoader({ title, detail, progress }: { title: string; detail?: string; progress?: { done: number; total: number } }) {
  const className = usePanelClass(styles.analysis);
  return (
    <div className={className} aria-live="polite">
      <ThinkingOrb state="composing" size={64} label={title} />
      <p className={styles.title}>{title}</p>
      {detail && <p className={styles.text}>{detail}</p>}
      {progress && progress.total > 0 && (
        <div className={styles.progress}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <span className="tabular">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}
    </div>
  );
}
