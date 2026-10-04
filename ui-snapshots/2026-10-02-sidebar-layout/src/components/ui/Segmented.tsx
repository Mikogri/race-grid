import { useSlidingIndicator } from './useSlidingIndicator';
import styles from './Segmented.module.css';

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Compact toggle group for modes and playback speed. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: SegmentedProps<T>) {
  const { containerRef, indicatorStyle } = useSlidingIndicator<HTMLDivElement>(String(value));
  return (
    <div ref={containerRef} className={styles.group} role="radiogroup" aria-label={label}>
      <span className={styles.indicator} style={indicatorStyle} aria-hidden="true" />
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          data-active={option.value === value}
          className={option.value === value ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
