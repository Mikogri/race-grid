import type { CSSProperties, ReactNode } from 'react';
import { IconTrophy } from '@tabler/icons-react';
import { recentForm } from '../../analytics/championship';
import type { SeasonModel } from '../../analytics/season';
import { Card } from '../../components/ui/Card';
import { formatPoints } from '../../lib/format';
import styles from './Leaderboard.module.css';

interface Entry {
  id: string | number;
  name: string;
  points: number;
  color: string;
}

const TOP = 5;

interface LeaderboardProps {
  entries: Entry[];
  children?: ReactNode;
}

/** Top of the table with share-of-leader bars that grow in once, staggered, when the card mounts. */
export function Leaderboard({ entries, children }: LeaderboardProps) {
  const leader = entries[0]?.points ?? 0;
  return (
    <Card icon={<IconTrophy stroke={1.5} />} title="Leaderboard">
      <ol className={styles.list}>
        {entries.slice(0, TOP).map((entry, index) => {
          const share = leader > 0 ? (entry.points / leader) * 100 : 0;
          return (
            <li key={entry.id} className={styles.item}>
              <span className={styles.row}>
                <span className={styles.position}>{index + 1}</span>
                <span className={styles.marker} style={{ background: entry.color }} aria-hidden="true" />
                <span className={styles.name}>{entry.name}</span>
                {index > 0 && <span className={styles.gap}>−{formatPoints(leader - entry.points)}</span>}
                <span className={styles.points}>{formatPoints(entry.points)} p</span>
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span className={styles.fill} style={{ width: `${share}%`, '--i': index, '--team': entry.color } as CSSProperties} />
              </span>
            </li>
          );
        })}
      </ol>
      {children}
    </Card>
  );
}

/** Finish → chip tone: win, podium, points, outside the points, not classified. */
function tone(result: string): string {
  if (!result.startsWith('P')) return styles.out;
  const position = Number(result.slice(1));
  if (position === 1) return styles.win;
  if (position <= 3) return styles.podium;
  return position <= 10 ? styles.scored : styles.noPoints;
}

/** Last five Grand Prix results of the top drivers (Figma: Recent Form), as tinted chips. */
export function RecentForm({ season }: { season: SeasonModel }) {
  return (
    <Card title="Recent Form" description="Last five Grand Prix, oldest first" className={styles.form}>
      <ul className={styles.formList}>
        {season.driverStandings.slice(0, TOP).map((s) => (
          <li key={s.driverNumber} className={styles.formRow}>
            <span className={styles.acronym}>{season.drivers.get(s.driverNumber)?.acronym ?? s.driverNumber}</span>
            {recentForm(season.results.get(s.driverNumber) ?? []).map((result, i) => (
              <span key={i} className={`${styles.chip} ${tone(result)}`}>
                {result}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}
