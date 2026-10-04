import { useState, useSyncExternalStore } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

const STORAGE_KEY = 'racegrid.sidebar';
/** Below this width the sidebar is an off-canvas drawer (matches Sidebar.module.css). */
const MOBILE_QUERY = '(max-width: 767px)';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed';
  } catch {
    // Storage blocked (privacy mode): start expanded.
    return false;
  }
}

function subscribeMobile(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

export function AppLayout() {
  const { pathname } = useLocation();
  const mobile = useSyncExternalStore(subscribeMobile, isMobile);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleSidebar = () => {
    if (mobile) {
      setDrawerOpen((open) => !open);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
    } catch (error) {
      console.warn('RaceGrid: could not persist sidebar state', error);
    }
  };

  return (
    <div
      className={styles.shell}
      data-collapsed={collapsed}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && drawerOpen) setDrawerOpen(false);
      }}
    >
      <Sidebar collapsed={collapsed && !mobile} open={drawerOpen} onNavigate={() => setDrawerOpen(false)} onToggle={toggleSidebar} />
      {mobile && drawerOpen && <div className={styles.backdrop} onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
      <div className={styles.main}>
        <TopBar sidebarExpanded={mobile ? drawerOpen : !collapsed} onToggleSidebar={toggleSidebar} />
        {/* Keyed by path: each navigation fades in (query-string changes do not). */}
        <main key={pathname} className={`${styles.content} rg-fade`}>
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </div>
  );
}
