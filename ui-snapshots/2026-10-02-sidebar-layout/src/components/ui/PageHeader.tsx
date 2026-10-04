import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { IconArrowNarrowLeft } from '@tabler/icons-react';
import styles from './PageHeader.module.css';

export interface HeaderMeta {
  label: string;
  value: ReactNode;
}

interface PageHeaderProps {
  title: ReactNode;
  /** One line under the title (Figma: "Explore every race of the season…"). */
  description?: ReactNode;
  back?: { to: string; label: string };
  /** Panel around the header with the key facts as label-over-value blocks beside the title (replay). */
  boxed?: boolean;
  /** Small leading visual, e.g. a team colour bar or track outline. */
  leading?: ReactNode;
  /** Key facts, shown on the subtitle line. */
  meta?: HeaderMeta[];
  actions?: ReactNode;
  /** Optional second row (tabs, KPI cards). */
  children?: ReactNode;
}

/** Page header (Figma: Header): red 28 px title (white with a red <mark> word when the title contains one), 12 px subtitle and key facts, the page's actions on the right. No box. */
export function PageHeader({ title, description, back, boxed = false, leading, meta = [], actions, children }: PageHeaderProps) {
  return (
    <header className={boxed ? `${styles.header} ${styles.boxed}` : styles.header}>
      <div className={styles.row}>
        {leading && <div className={styles.leading}>{leading}</div>}
        <div className={styles.titleBlock}>
          {back && (
            <Link to={back.to} className={styles.back} aria-label={back.label} title={back.label}>
              <IconArrowNarrowLeft size={18} stroke={1.5} aria-hidden="true" />
              Back
            </Link>
          )}
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
          {!boxed && meta.length > 0 && (
            <dl className={styles.meta}>
              {meta.map((item) => (
                <div key={item.label} className={styles.metaItem}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {boxed && meta.length > 0 && (
          <dl className={styles.facts}>
            {meta.map((item) => (
              <div key={item.label} className={styles.fact}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </header>
  );
}
