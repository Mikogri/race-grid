import type { ReactNode } from "react";
import { InfoTip } from "./Tooltip";
import styles from "./DetailList.module.css";

/** Key/value grid used in detail panels (reference: Team / Status / Lead …). A hint shows as an info icon with a tooltip. */
export function DetailList({
  items,
}: {
  items: { label: string; value: ReactNode; hint?: string }[];
}) {
  return (
    <dl className={styles.list}>
      {items.map((item) => (
        <div key={item.label} className={styles.row}>
          <dt>
            {item.label}
            {item.hint && <InfoTip content={item.hint} size={13} />}
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className={styles.sectionLabel}>{children}</h3>;
}
