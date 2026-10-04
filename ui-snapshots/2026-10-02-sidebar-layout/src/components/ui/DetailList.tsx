import type { ReactNode } from 'react';
import styles from './DetailList.module.css';

/** Key/value grid used in detail panels (reference: Team / Status / Lead …). */
export function DetailList({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <dl className={styles.list}>
      {items.map((item) => (
        <div key={item.label} className={styles.row} title={item.hint}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className={styles.sectionLabel}>{children}</h3>;
}
