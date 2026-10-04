import type { CSSProperties, ReactNode } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { InfoTip } from './Tooltip';
import styles from './Metric.module.css';

export type TrendDirection = 'up' | 'down' | 'flat';

export type MetricTone = 'red' | 'blue' | 'green' | 'amber' | 'violet' | 'cyan';

/** Cards without an explicit tone take the next one, so a row of KPIs is never monochrome. */
const TONE_CYCLE: MetricTone[] = ['red', 'blue', 'green', 'amber', 'violet', 'cyan'];

export interface MetricItem {
  label: string;
  value: ReactNode;
  /** Tabler icon for the header tile. */
  icon?: ReactNode;
  /** Footer text (context, comparison). */
  sub?: ReactNode;
  /** Chip at the right of the footer. */
  trend?: { value: ReactNode; direction: TrendDirection };
  /** Figures get tabular digits so rows of cards line up. */
  numeric?: boolean;
  /** Explanation behind the info icon. */
  hint?: string;
  /** Colour of the icon tile (default: cycles red, blue, green, amber, violet, cyan). */
  tone?: MetricTone;
}

/** Small change chip: green up, red down, grey flat (Figma: Trend). */
export function Trend({ value, direction }: { value: ReactNode; direction: TrendDirection }) {
  const Icon = direction === 'down' ? IconChevronDown : IconChevronUp;
  return (
    <span className={styles.trend} data-direction={direction}>
      <span className="tabular">{value}</span>
      {direction !== 'flat' && <Icon size={10} stroke={1.5} aria-hidden="true" />}
    </span>
  );
}

/** KPI cards (Figma: Summary): icon tile + label + info, 32 px value, footer with context and a trend chip. */
/** `compact`: 18 px values, for rows of names (winner, pole) rather than headline figures. */
export function MetricGroup({ items, className, compact = false }: { items: MetricItem[]; className?: string; compact?: boolean }) {
  return (
    <dl className={[styles.group, 'rg-stagger', compact ? styles.compact : '', className].filter(Boolean).join(' ')}>
      {items.map((item, index) => (
        <div key={item.label} className={styles.card} style={{ '--tone': `var(--tone-${item.tone ?? TONE_CYCLE[index % TONE_CYCLE.length]})` } as CSSProperties}>
          <div className={styles.content}>
            <div className={styles.header}>
              <dt className={styles.label}>
                {item.icon && (
                  <span className={styles.badge} aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className={styles.labelText}>{item.label}</span>
              </dt>
              {item.hint && (
                <InfoTip content={item.hint} />
              )}
            </div>
            <dd className={`${styles.value} ${item.numeric ? 'tabular' : ''}`}>{item.value}</dd>
          </div>
          {(item.sub != null || item.trend) && (
            <dd className={styles.footer}>
              <span className={styles.sub}>{item.sub}</span>
              {item.trend && <Trend value={item.trend.value} direction={item.trend.direction} />}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
