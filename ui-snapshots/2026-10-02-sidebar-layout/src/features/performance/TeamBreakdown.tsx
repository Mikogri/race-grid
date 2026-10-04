import { COMPONENT_LABEL, FORMULA, WEIGHTS, type ComponentKey, type TeamPerformance } from '../../analytics/performance';
import type { SeasonModel } from '../../analytics/season';
import { Card } from '../../components/ui/Card';
import { SectionLabel } from '../../components/ui/DetailList';
import { TeamMarker } from '../../components/ui/TeamMarker';
import styles from './PerformancePage.module.css';

const KEYS = Object.keys(WEIGHTS) as ComponentKey[];

/** Explains how one team's index was built: score, raw input, weight and contribution per component. */
export function TeamBreakdown({ team, season }: { team: TeamPerformance; season: SeasonModel }) {
  const present = KEYS.filter((k) => team.components[k].score !== null);
  const weightSum = present.reduce((s, k) => s + WEIGHTS[k], 0);
  const topDriver = team.dependency.topDriver !== null ? season.drivers.get(team.dependency.topDriver) : undefined;

  return (
    <Card title="Why this score">
      <div className={styles.breakdownHead}>
        <TeamMarker color={team.color} size="lg" />
        <div>
          <p className={styles.breakdownTeam}>{team.teamName}</p>
          <p className={styles.breakdownIndex}>
            <span className="tabular">{team.index?.toFixed(1) ?? '—'}</span> <span className={styles.weight}>index · {team.rounds} rounds</span>
          </p>
        </div>
      </div>
      <ul key={team.teamName} className={styles.components}>
        {KEYS.map((k) => {
          const c = team.components[k];
          const contribution = c.score !== null && weightSum ? (c.score * WEIGHTS[k]) / weightSum : null;
          return (
            <li key={k} title={FORMULA[k]}>
              <div className={styles.componentHead}>
                <span>{COMPONENT_LABEL[k]}</span>
                <span className="tabular">{c.score?.toFixed(1) ?? '—'}</span>
              </div>
              <div className={styles.meter}>
                <div style={{ width: `${c.score ?? 0}%` }} />
              </div>
              <div className={styles.componentMeta}>
                <span>{c.rawLabel}</span>
                <span className="tabular">
                  × {Math.round((WEIGHTS[k] / (weightSum || 1)) * 100)}% = {contribution?.toFixed(1) ?? '—'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <SectionLabel>Driver dependency</SectionLabel>
      <p className={styles.dependency}>
        {team.dependency.share === null
          ? 'No points scored yet.'
          : `${topDriver?.fullName ?? 'Top scorer'} scored ${team.dependency.share.toFixed(0)}% of the team's points → ${team.dependency.level}.`}
      </p>
    </Card>
  );
}
