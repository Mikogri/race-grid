import type { CSSProperties, ReactNode } from 'react';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { LIVE_LOCKED, OpenF1Error, TIMED_OUT } from '../../api/openf1/client';
import { Button } from './Button';
import { ThinkingOrb } from './ThinkingOrb';
import { useInCard } from './cardContext';
import styles from './StateViews.module.css';

/** Outside a Card every state renders as its own panel, so nothing sits directly on the page background. */
function usePanelClass(base: string) {
  return useInCard() ? base : `${base} ${styles.panel}`;
}

/** Line widths that vary row to row, so the skeleton reads like real content. */
const LINE_WIDTHS = [62, 48, 74, 55, 68, 41, 70, 52];

/**
 * Skeleton for ordinary requests. By default it mimics list / table rows (position, portrait, name and
 * meta line, figure on the right); with `height` it draws plain blocks (maps, charts). One light sweep runs
 * across every bone and rows appear one after another.
 */
export function Skeleton({ rows = 6, height }: { rows?: number; height?: string }) {
  const className = usePanelClass(styles.skeleton);
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) =>
        height ? (
          <div key={i} className={`${styles.bone} ${styles.block}`} style={{ height, '--i': i } as CSSProperties} />
        ) : (
          <div key={i} className={styles.skeletonRow} style={{ '--i': i } as CSSProperties}>
            <span className={`${styles.bone} ${styles.boneIndex}`} />
            <span className={`${styles.bone} ${styles.boneAvatar}`} />
            <span className={styles.boneLines}>
              <span className={styles.bone} style={{ width: `${LINE_WIDTHS[i % LINE_WIDTHS.length]}%` }} />
              <span className={`${styles.bone} ${styles.boneMeta}`} style={{ width: `${LINE_WIDTHS[(i + 3) % LINE_WIDTHS.length] / 2}%` }} />
            </span>
            <span className={`${styles.bone} ${styles.boneFigure}`} />
          </div>
        ),
      )}
    </div>
  );
}

/** One skeleton bone: a line by default, a rounded block with `block`. */
export function Bone({ width, height, block = false, className }: { width?: string; height?: string; block?: boolean; className?: string }) {
  return <span className={[styles.bone, block ? styles.block : '', className].filter(Boolean).join(' ')} style={{ width, height }} />;
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

/** Title and explanation for an error; OpenF1's live lock, timeouts and rate limits get plain-language texts. */
function describe(error: unknown): { title: string; text: string } {
  const status = error instanceof OpenF1Error ? error.status : null;
  if (status === LIVE_LOCKED) {
    return {
      title: 'Live session in progress',
      text: 'OpenF1 serves data only to paid accounts while a session is live. Everything already loaded stays available; the rest returns after the session.',
    };
  }
  if (status === TIMED_OUT) return { title: 'OpenF1 is not responding', text: 'The request took too long, which usually means heavy load during a live session. Retry in a moment.' };
  if (status === 429) return { title: 'Could not load data', text: 'OpenF1 rate limit reached. Requests resume automatically — retry in a minute.' };
  return { title: 'Could not load data', text: error instanceof Error ? error.message : 'Unknown error' };
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const className = usePanelClass(styles.state);
  const message = describe(error);
  return (
    <div className={className} role="alert">
      <p className={styles.title}>
        <IconAlertTriangle size={16} stroke={1.5} aria-hidden="true" className={styles.errorIcon} />
        {title ?? message.title}
      </p>
      <p className={styles.text}>{message.text}</p>
      {onRetry && (
        <Button className={styles.retry} onClick={onRetry} icon={<IconRefresh size={14} stroke={1.5} aria-hidden="true" />}>
          Retry
        </Button>
      )}
    </div>
  );
}

/** Heavy-processing state (replay preparation, analysis). The only place the thinking orb is used. */
export function AnalysisLoader({ title, progress }: { title: string; progress?: { done: number; total: number } }) {
  const className = usePanelClass(styles.analysis);
  return (
    <div className={className} aria-live="polite">
      <ThinkingOrb state="composing" size={64} label={title} />
      <p className={styles.title}>{title}</p>
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
