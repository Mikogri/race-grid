import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router';
import { IconChevronRight, IconLayoutSidebar } from '@tabler/icons-react';
import { getRateLimitStatus, subscribeRateLimit } from '../../api/openf1/rateLimiter';
import { LogoSymbol } from '../ui/Logo';
import { NAV_GROUPS, isNavItemActive } from './navigation';
import styles from './Sidebar.module.css';

interface SidebarProps {
  /** Icon rail (desktop only; the mobile drawer is always expanded). */
  collapsed: boolean;
  /** Mobile drawer visibility (below 768 px the sidebar is off-canvas). */
  open: boolean;
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate: () => void;
  onToggle: () => void;
}

export function Sidebar({ collapsed, open, onNavigate, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  return (
    <aside id="app-sidebar" className={styles.sidebar} data-collapsed={collapsed} data-open={open}>
      <div className={styles.brandRow}>
        <Link to="/" className={styles.brand} aria-label="RaceGrid home" onClick={onNavigate}>
          <LogoSymbol size={35} />
          <span className={styles.wordmark}>RaceGrid</span>
        </Link>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-controls="app-sidebar"
          aria-expanded={!collapsed}
        >
          <span className={styles.toggleLogo} aria-hidden="true">
            <LogoSymbol size={24} />
          </span>
          <IconLayoutSidebar className={styles.toggleIcon} size={18} stroke={1.5} aria-hidden="true" />
        </button>
      </div>
      <nav aria-label="Main" className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className={styles.group}>
            <p id={`nav-${group.title}`} className={styles.groupLabel}>
              {group.title}
            </p>
            <ul aria-labelledby={`nav-${group.title}`} className={styles.list}>
              {group.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={active ? `${styles.link} ${styles.active}` : styles.link}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                    >
                      <Icon className={styles.icon} stroke={1.5} aria-hidden="true" />
                      <span className={styles.label}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.footer}>
        <DataSource />
      </div>
    </aside>
  );
}

/** OpenF1 link with the request queue state: green when idle, pulsing while loading, amber when rate limited. */
function DataSource() {
  const status = useSyncExternalStore(subscribeRateLimit, getRateLimitStatus);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status.pausedUntil === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status.pausedUntil]);

  let state: 'idle' | 'busy' | 'waiting' = 'idle';
  let text = 'Data source: OpenF1';
  if (status.pausedUntil !== null) {
    state = 'waiting';
    text = `OpenF1 rate limit · ${Math.max(1, Math.ceil((status.pausedUntil - now) / 1000))}s`;
  } else if (status.queued > 0) {
    state = 'busy';
    text = `OpenF1 · ${status.queued} queued`;
  }

  return (
    <a className={styles.source} href="https://openf1.org" target="_blank" rel="noreferrer" title="OpenF1 API">
      <span className={styles.sourceText} role="status">
        <span className={styles.dot} data-state={state} aria-hidden="true" />
        <span className={`${styles.label} tabular`}>{text}</span>
      </span>
      <IconChevronRight className={styles.sourceArrow} size={12} stroke={1.5} aria-hidden="true" />
    </a>
  );
}
