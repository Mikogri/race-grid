import { IconCalendarWeek, IconMenu2, IconSparkles } from '@tabler/icons-react';
import { SEASONS, useSelectedSeason } from '../../app/seasons';
import { useSeason } from '../../data/season';
import { Button, ButtonLink } from '../ui/Button';
import { Select } from '../ui/Select';
import { GlobalSearch } from './GlobalSearch';
import styles from './TopBar.module.css';

interface TopBarProps {
  sidebarExpanded: boolean;
  /** Opens the drawer on mobile (on desktop the sidebar has its own toggle). */
  onToggleSidebar: () => void;
}

/** 60 px bar above the content: search on the left; season and the quick analysis of the latest round on the right. */
export function TopBar({ sidebarExpanded, onToggleSidebar }: TopBarProps) {
  const { year, setYear } = useSelectedSeason();
  const { season } = useSeason(year);
  const latest = season?.completedRounds[season.completedRounds.length - 1];

  return (
    <header className={styles.bar}>
      <Button
        variant="icon"
        className={styles.menu}
        onClick={onToggleSidebar}
        aria-label={sidebarExpanded ? 'Close menu' : 'Open menu'}
        aria-controls="app-sidebar"
        aria-expanded={sidebarExpanded}
        icon={<IconMenu2 size={18} stroke={1.5} aria-hidden="true" />}
      />
      <GlobalSearch />
      <div className={styles.tools}>
        <Select
          label="Season"
          value={year}
          onChange={setYear}
          options={SEASONS.map((s) => ({ value: s, label: `${s} Season` }))}
          icon={<IconCalendarWeek size={15} stroke={1.5} aria-hidden="true" />}
          className={styles.season}
        />
        {latest && (
          <ButtonLink
            to={`/rounds/${latest.meeting.meeting_key}`}
            variant="primary"
            className={styles.analyze}
            title={`Analyze ${latest.meeting.meeting_name}`}
            icon={<IconSparkles size={15} stroke={1.5} aria-hidden="true" />}
          >
            <span className={styles.analyzeLabel}>Quick Analyze</span>
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
