import { Outlet, useLocation } from 'react-router';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className={styles.shell}>
      <TopBar />
      {/* The page scrolls under the menu, so the scrollbar starts below it. Keyed by path: each page opens at the top and fades in. */}
      <div key={pathname} className={styles.scroll} data-page-scroll>
        <main className={`${styles.content} rg-fade`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
