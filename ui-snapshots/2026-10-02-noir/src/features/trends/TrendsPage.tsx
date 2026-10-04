import { useState } from 'react';
import {
  driverEntities,
  driverQualifyingTrend,
  driverRacePaceTrend,
  finishTrend,
  indexTrend,
  pointsProgression,
  teamEntities,
  teamQualifyingTrend,
  teamRacePaceTrend,
  twoCarTrend,
  type TrendSeries,
} from '../../analytics/trends';
import { useSelectedSeason } from '../../app/seasons';
import { AnalysisBanner } from '../../components/AnalysisBanner';
import { LineChart } from '../../components/charts/LineChart';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Select } from '../../components/ui/Select';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import { Tabs } from '../../components/ui/Tabs';
import { InfoTip } from '../../components/ui/Tooltip';
import { useRacePace } from '../../data/seasonPace';
import { useSeason } from '../../data/season';
import { SeasonOverSeason } from './SeasonOverSeason';
import styles from './TrendsPage.module.css';

type View = 'teams' | 'drivers';
const DEFAULT_DRIVERS = 6;
const TOP_TEAMS = 5;

/** One trend per panel; every panel in the grid has the same size, the note sits behind an info icon. */
function TrendCard({ title, series, format, reversed, domain, note }: { title: string; series: TrendSeries[]; format: (y: number) => string; reversed?: boolean; domain?: [number, number]; note?: string }) {
  const hasData = series.some((s) => s.points.length > 0);
  return (
    <Card
      title={
        <span className={styles.title}>
          {title}
          {note && <InfoTip content={note} size={13} />}
        </span>
      }
      className={styles.card}
    >
      {hasData ? (
        <LineChart label={title} series={series} height={240} yReversed={reversed} yDomain={domain} formatX={(x) => `R${Math.round(x)}`} formatY={format} alwaysShowLegend />
      ) : (
        <EmptyState title="No data yet" />
      )}
    </Card>
  );
}

export function TrendsPage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);
  const [view, setView] = useState<View>('teams');
  const [extraDriver, setExtraDriver] = useState<number | null>(null);
  const [allTeams, setAllTeams] = useState(false);
  const racePace = useRacePace(season?.completedRounds ?? [], Boolean(season));

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending || !season) return <Skeleton rows={12} />;
  if (season.completedRounds.length === 0) return <EmptyState title={`No completed rounds in ${year} yet`} />;

  const pace = racePace.pace.size ? racePace.pace : null;
  const pct = (y: number) => `${y.toFixed(2)}%`;
  const driverNumbers = [...season.driverStandings.slice(0, DEFAULT_DRIVERS).map((d) => d.driverNumber)];
  if (extraDriver !== null && !driverNumbers.includes(extraDriver)) driverNumbers.push(extraDriver);
  const teams = teamEntities(season).slice(0, allTeams ? undefined : TOP_TEAMS);
  const drivers = driverEntities(season, driverNumbers);

  return (
    <>
      <PageHeader
        title={`${year} Trends`}
        description="Observed changes only: RaceGrid reports what the timing shows, never why (upgrades, set-up or driver changes are not in OpenF1)."
        meta={[
          { label: 'Rounds', value: season.completedRounds.length },
          { label: 'Race pace data', value: `${racePace.progress.done} / ${racePace.progress.total}` },
        ]}
      />
      {!racePace.complete && !racePace.error && <AnalysisBanner progress={racePace.progress} />}
      {racePace.error ? <ErrorState title="Race pace could not be computed" error={racePace.error} /> : null}
      {/* Inner menu on the left, the view's own controls on the right. */}
      <div className={styles.toolbar}>
        <Tabs
          label="Trend subject"
          value={view}
          onChange={setView}
          items={[
            { id: 'teams', label: 'Teams' },
            { id: 'drivers', label: 'Drivers' },
          ]}
        />
        <div className={styles.controls}>
          {view === 'teams' ? (
            <Segmented
              label="Teams shown"
              value={allTeams ? 'all' : 'top'}
              onChange={(v) => setAllTeams(v === 'all')}
              options={[
                { value: 'top', label: `Top ${TOP_TEAMS}` },
                { value: 'all', label: 'All teams' },
              ]}
            />
          ) : (
            <Select
              label="Add driver"
              value={extraDriver}
              placeholder="Add a driver…"
              onChange={setExtraDriver}
              options={season.driverStandings.slice(DEFAULT_DRIVERS).map((s) => ({
                value: s.driverNumber,
                label: season.drivers.get(s.driverNumber)?.fullName ?? `#${s.driverNumber}`,
              }))}
            />
          )}
        </div>
      </div>
      {view === 'teams' ? (
        <>
          <div className={styles.grid}>
            <TrendCard title="Championship points" series={pointsProgression(season, teams, 'teams')} format={(y) => String(Math.round(y))} />
            <TrendCard
              title="Performance Index (cumulative)"
              series={indexTrend(season, teams, pace)}
              format={(y) => y.toFixed(0)}
              note="Index recomputed over all rounds up to each round. See Performance for the formula."
            />
            <TrendCard title="Qualifying gap to fastest (%)" series={teamQualifyingTrend(season, teams)} format={pct} reversed note="Lower is faster. Best lap of either car, any phase." />
            <TrendCard
              title="Race pace gap to fastest team (%)"
              series={pace ? teamRacePaceTrend(season, teams, pace) : []}
              format={pct}
              reversed
              note="Median clean lap of the team's better car vs the fastest team."
            />
            <TrendCard title="Two-car strength" series={twoCarTrend(season, teams)} format={(y) => y.toFixed(0)} domain={[0, 100]} note="Position score of the weaker car: (21 − finish) ÷ 20 × 100." />
          </div>
          <SeasonOverSeason currentYear={year} />
        </>
      ) : (
        <div className={styles.grid}>
          <TrendCard title="Championship points" series={pointsProgression(season, drivers, 'drivers')} format={(y) => String(Math.round(y))} />
          <TrendCard title="Finishing position" series={finishTrend(season, drivers)} format={(y) => `P${Math.round(y)}`} reversed domain={[1, 20]} />
          <TrendCard title="Qualifying gap to fastest (%)" series={driverQualifyingTrend(season, drivers)} format={pct} reversed />
          <TrendCard
            title="Race pace gap to fastest driver (%)"
            series={pace ? driverRacePaceTrend(drivers, pace) : []}
            format={pct}
            reversed
            note="Median clean race lap vs the fastest driver median of the round."
          />
        </div>
      )}
    </>
  );
}
