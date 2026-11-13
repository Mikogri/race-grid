import { Outlet, useLocation } from "react-router";
import { IconArrowUpRight } from "@tabler/icons-react";
import { LiveNotice } from "./LiveNotice";
import { TopBar } from "./TopBar";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className={styles.shell}>
      <TopBar />
      {/* The page scrolls under the menu, so the scrollbar starts below it. Keyed by path: each page opens at the top and its sections rise in. */}
      <div key={pathname} className={styles.scroll} data-page-scroll>
        <main className={`${styles.content} rg-page`}>
          <LiveNotice />
          <Outlet />
        </main>
        {/* Page footer, at the very end of the scroll: the one place that names the data source. */}
        <footer className={styles.footer}>
          <span>Data source</span>
          <a
            href="https://openf1.org"
            target="_blank"
            rel="noreferrer"
            className={styles.source}
          >
            OpenF1
            <IconArrowUpRight size={12} stroke={1.5} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </div>
  );
}
