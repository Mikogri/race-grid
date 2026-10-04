import { ThinkingOrb } from './ui/ThinkingOrb';
import styles from './AnalysisBanner.module.css';

/** Compact in-page progress for long analyses; results already shown stay usable meanwhile. */
export function AnalysisBanner({ progress, label = 'Analysing race laps' }: { progress: { done: number; total: number }; label?: string }) {
  return (
    <div className={styles.banner} role="status">
      <ThinkingOrb size={20} state="composing" label={label} />
      <span>
        {label} · {progress.done}/{progress.total} races
      </span>
      <span className={styles.bannerNote}>Race pace needs every lap of every race; each race is downloaded once and kept in the browser cache.</span>
    </div>
  );
}
