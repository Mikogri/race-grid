import type { ReactNode } from 'react';
import { SurfaceContext, useSurface } from './cardContext';
import { InfoTip } from './Tooltip';
import styles from './Card.module.css';

interface HeaderProps {
  /** Tabler icon shown in a small tile before the title (Figma: card header badge). */
  icon?: ReactNode;
  title?: ReactNode;
  /** One line under the title (reference: "Monthly revenue vs. operating expenses"). */
  description?: ReactNode;
  /** Explanation behind an info icon after the title. */
  info?: string;
  /** Right side of the header: filters, links, small actions. */
  actions?: ReactNode;
}

/** Icon tile of a card header. */
export function IconBadge({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <span className={large ? `${styles.badge} ${styles.badgeLarge}` : styles.badge} aria-hidden="true">
      {children}
    </span>
  );
}

function Heading({ icon, title, description, info, large = false }: Pick<HeaderProps, 'icon' | 'title' | 'description' | 'info'> & { large?: boolean }) {
  return (
    <div className={styles.heading}>
      {icon && <IconBadge large={large}>{icon}</IconBadge>}
      <div className={styles.headingText}>
        {title && (
          <h2 className={styles.title}>
            {title}
            {info && <InfoTip content={info} size={13} />}
          </h2>
        )}
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </div>
  );
}

function Header({ icon, title, description, info, actions }: HeaderProps) {
  if (!title && !description && !actions) return null;
  return (
    <header className={styles.header}>
      {(title || description) && <Heading icon={icon} title={title} description={description} info={info} />}
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

interface CardProps extends HeaderProps {
  children: ReactNode;
  /** Strip under the body on the raised surface (Figma: KPI footer). */
  footer?: ReactNode;
  className?: string;
  /** Remove body padding for edge-to-edge tables and charts. */
  flush?: boolean;
  as?: 'section' | 'div' | 'article';
}

/** A titled block. On the page it is a panel; inside a panel it becomes a hairline group, never a panel in a panel. */
export function Card({ icon, title, description, info, actions, children, footer, className, flush = false, as: Tag = 'section' }: CardProps) {
  const surface = useSurface();
  return (
    <Tag className={[surface === 'page' ? styles.panel : styles.group, className].filter(Boolean).join(' ')}>
      <Header icon={icon} title={title} description={description} info={info} actions={actions} />
      <div className={flush ? styles.flush : styles.body}>
        <SurfaceContext value="panel">{children}</SurfaceContext>
      </div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </Tag>
  );
}

interface PanelProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Tabs, filters and actions of the section; rendered in the header row. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Pad the body (default). Turn off when the content is a single edge-to-edge table or chart. */
  padded?: boolean;
}

/** Workspace panel: one section holding its tabs/tools and the data they control. */
export function Panel({ icon, title, description, toolbar, children, className, padded = true }: PanelProps) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')}>
      {(title || description || toolbar) && (
        <div className={styles.toolbar}>
          {(title || description) && <Heading icon={icon} title={title} description={description} large />}
          {toolbar}
        </div>
      )}
      <div className={padded ? styles.workspaceBody : styles.flush}>
        <SurfaceContext value="panel">{children}</SurfaceContext>
      </div>
    </section>
  );
}

/** Supporting column beside the main content: a stack of separate panels (Figma: Leaderboard column). */
export function DetailPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <aside className={[styles.column, className].filter(Boolean).join(' ')}>{children}</aside>;
}
