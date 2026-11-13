import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { IconChevronRight, IconSmartHome } from '@tabler/icons-react';
import styles from './PageHeader.module.css';

export interface Crumb {
  label: string;
  to: string;
}

export interface HeaderMeta {
  label: string;
  value: ReactNode;
}

interface PageHeaderProps {
  title: ReactNode;
  /** One line under the title (Figma: "Explore every race of the season…"). */
  description?: ReactNode;
  /** Parent pages, shown above the title as a Home › … trail ending in Back (to the nearest one). */
  crumbs?: Crumb[];
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

/** Page header: breadcrumbs, a light 30 px title (one accent <mark> word allowed), 12 px subtitle and key facts, the page's actions on the right. */
export function PageHeader({ title, description, crumbs, boxed = false, leading, meta = [], actions, children }: PageHeaderProps) {
  return (
    <header className={boxed ? `${styles.header} ${styles.boxed}` : styles.header}>
      <div className={styles.row}>
        {leading && <div className={styles.leading}>{leading}</div>}
        <div className={styles.titleBlock}>
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className={styles.crumbs}>
                <li>
                  <Link to="/" className={styles.crumbLink} aria-label="Dashboard">
                    <IconSmartHome size={14} stroke={1.5} aria-hidden="true" />
                  </Link>
                </li>
                {crumbs.map((crumb) => (
                  <li key={crumb.label}>
                    <IconChevronRight className={styles.crumbSeparator} size={12} stroke={1.5} aria-hidden="true" />
                    <Link to={crumb.to} className={styles.crumbLink}>
                      {crumb.label}
                    </Link>
                  </li>
                ))}
                {/* Back: the last step of the trail, to the nearest parent page. */}
                <li>
                  <IconChevronRight className={styles.crumbSeparator} size={12} stroke={1.5} aria-hidden="true" />
                  <Link to={crumbs[crumbs.length - 1].to} className={`${styles.crumbLink} ${styles.back}`}>
                    Back
                  </Link>
                </li>
              </ol>
            </nav>
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
