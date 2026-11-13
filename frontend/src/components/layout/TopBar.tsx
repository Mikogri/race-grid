import { useState } from "react";
import { Link, useLocation } from "react-router";
import { IconCalendarWeek, IconMenu2, IconX } from "@tabler/icons-react";
import { SEASONS, useSelectedSeason } from "../../app/seasons";
import { Button } from "../ui/Button";
import { LogoSymbol } from "../ui/Logo";
import { Select } from "../ui/Select";
import { useSlidingIndicator } from "../ui/useSlidingIndicator";
import { NAV_ITEMS, isNavItemActive } from "./navigation";
import styles from "./TopBar.module.css";

/** Top menu: brand at the far left, sections centred, the season at the far right. Below 1240 px the sections fold into a menu. */
export function TopBar() {
  const { pathname } = useLocation();
  const { year, setYear } = useSelectedSeason();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  // The highlight slides from the previous section to the new one.
  const activeItem = NAV_ITEMS.find((item) => isNavItemActive(item, pathname));
  const { containerRef, indicatorStyle } =
    useSlidingIndicator<HTMLUListElement>(activeItem?.to ?? "none");

  return (
    <header
      className={styles.bar}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <div className={styles.inner}>
        <Link
          to="/"
          className={styles.brand}
          aria-label="RaceGrid home"
          onClick={close}
        >
          <span className={styles.logo}>
            <LogoSymbol size={26} />
          </span>
          <span className={styles.wordmark}>RaceGrid</span>
        </Link>
        <nav
          id="main-menu"
          aria-label="Main"
          className={styles.nav}
          data-open={menuOpen}
        >
          <ul ref={containerRef} className={styles.list}>
            <li
              className={styles.indicator}
              style={indicatorStyle}
              aria-hidden="true"
            />
            {NAV_ITEMS.map((item) => {
              const active = item === activeItem;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={
                      active ? `${styles.link} ${styles.active}` : styles.link
                    }
                    aria-current={active ? "page" : undefined}
                    data-active={active}
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.tools}>
          <Select
            label="Season"
            value={year}
            onChange={setYear}
            options={SEASONS.map((s) => ({ value: s, label: `${s} Season` }))}
            icon={
              <IconCalendarWeek size={15} stroke={1.5} aria-hidden="true" />
            }
            className={styles.season}
          />
          <Button
            variant="icon"
            className={styles.menuButton}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-controls="main-menu"
            aria-expanded={menuOpen}
            icon={
              menuOpen ? (
                <IconX size={18} stroke={1.5} aria-hidden="true" />
              ) : (
                <IconMenu2 size={18} stroke={1.5} aria-hidden="true" />
              )
            }
          />
        </div>
      </div>
      {menuOpen && (
        <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      )}
    </header>
  );
}
