import type { CSSProperties, ReactNode } from 'react';
import { useParams } from 'react-router';
import { recentForm } from '../../analytics/championship';
import { summarize, type DriverSummary } from '../../analytics/driverStats';
import { fieldBestByRound, qualifyingGapPercent } from '../../analytics/qualifying';
import { LineChart } from '../../components/charts/LineChart';
import layout from '../../components/layout/PageLayout.module.css';
import { Card } from '../../components/ui/Card';
import { DetailList } from '../../components/ui/DetailList';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews';
import { TeamMarker } from '../../components/ui/TeamMarker';
import { useSeason } from '../../data/season';
import { driverCountry } from '../../lib/countries';
import { formatPoints } from '../../lib/format';
import { DriverResultsTable } from './DriverResultsTable';
import styles from './DriverPage.module.css';
import { TeammateCard } from './TeammateCard';

export function DriverPage() {
  const params = useParams();
  const year = Number(params.year);
  const driverNumber = Number(params.driverNumber);
  const { season, isPending, error, refetch } = useSeason(year);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending || !season) return <Skeleton rows={10} />;

  const driver = season.drivers.get(driverNumber);
  const results = season.results.get(driverNumber) ?? [];
  if (!driver) return <EmptyState title={`No driver #${driverNumber} in ${year}`}>OpenF1 has no race or qualifying entry for this number.</EmptyState>;

  const standing = season.driverStandings.find((s) => s.driverNumber === driverNumber);
  const summary = summarize(results);
  const fieldBest = fieldBestByRound(season);
  const roundName = new Map(season.rounds.map((r) => [r.round, r.meeting.location]));

  const positions = [
    { id: 'grid', label: 'Grid', color: 'var(--chart-neutral)', dashed: true, points: results.filter((r) => r.grid !== null).map((r) => ({ x: r.round, y: r.grid ?? 0 })) },
    { id: 'finish', label: 'Finish', color: driver.color, points: results.filter((r) => r.finish !== null).map((r) => ({ x: r.round, y: r.finish ?? 0 })) },
  ];
  const qualiGap = results
    .map((r) => ({ x: r.round, y: qualifyingGapPercent(r, fieldBest) }))
    .filter((p): p is { x: number; y: number } => p.y !== null);

  const rate = (count: number) => (summary.starts > 0 ? count / summary.starts : 0);
  const classified = summary.starts - summary.dnf - summary.dns - summary.dsq;
  const country = driverCountry(driver);
  const form = recentForm(results);

  return (
    <>
      <PageHeader crumbs={[{ to: '/standings', label: 'Standings' }]} title={driver.fullName} description={`${driver.teamName} · ${year} season`} />

      <section className={styles.hero} style={{ '--team': driver.color } as CSSProperties}>
        {/* Oversized race number behind the content, in the team colour. */}
        <span className={styles.watermark} aria-hidden="true">
          {driver.driverNumber}
        </span>
        <div className={styles.portrait}>
          {driver.headshotUrl ? <img src={driver.headshotUrl} alt="" /> : <span className={styles.initials}>{driver.acronym}</span>}
        </div>
        <div className={styles.identity}>
          <span className={styles.number}>#{driver.driverNumber}</span>
          <h2 className={styles.name}>
            <span className={styles.firstName}>{driver.firstName}</span> {driver.lastName}
          </h2>
          <p className={styles.team}>
            <TeamMarker color={driver.color} />
            {driver.teamName}
            <span className={styles.dot}>·</span>
            {country ?? 'Country unknown'}
            <span className={styles.dot}>·</span>
            <span className="mono">{driver.acronym}</span>
          </p>
          <p className={styles.bio}>
            {biography(driver.lastName, driver.teamName, year, standing?.position ?? null, standing?.points ?? null, summary, season.completedRounds.length)}
          </p>
          <div className={styles.form}>
            <span className={styles.formLabel}>Recent form</span>
            <span className={styles.formChips}>
              {form.length
                ? form.map((result, i) => (
                    <span key={i} className={styles.chip} data-tone={formTone(result)}>
                      {result}
                    </span>
                  ))
                : '—'}
            </span>
          </div>
        </div>
        <dl className={styles.stats}>
          <Stat label="Championship" value={standing?.position ? `P${standing.position}` : '—'} />
          <Stat label="Points" value={formatPoints(standing?.points)} />
          <Stat label="Wins" value={summary.wins} />
          <Stat label="Podiums" value={summary.podiums} />
          <Stat label="Poles" value={summary.poles} />
          <Stat label="Best finish" value={summary.bestFinish ? `P${summary.bestFinish}` : '—'} />
        </dl>
      </section>

      {results.length > 0 && (
        <div className={layout.twoCol}>
          <Card title="Grid to finish by round">
            <LineChart
              label={`${driver.acronym} grid and finishing positions by round`}
              series={positions}
              yReversed
              yDomain={[1, 20]}
              yTicks={[1, 5, 10, 15, 20]}
              formatX={(x) => `R${x} ${roundName.get(x) ?? ''}`}
              formatY={(y) => `P${Math.round(y)}`}
            />
          </Card>
          <Card title="Qualifying gap to fastest lap">
            <LineChart
              label={`${driver.acronym} qualifying gap to the fastest lap per round`}
              series={[{ id: 'gap', label: 'Gap %', color: driver.color, points: qualiGap }]}
              formatX={(x) => `R${x} ${roundName.get(x) ?? ''}`}
              formatY={(y) => `${y.toFixed(2)}%`}
              alwaysShowLegend
            />
          </Card>
        </div>
      )}
      <div className={layout.threeCol}>
        <Card title="Performance" description={`${summary.starts} starts this season`}>
          <ul className={styles.rates}>
            <Rate label="Win rate" value={rate(summary.wins)} tone="var(--tone-red)" />
            <Rate label="Podium rate" value={rate(summary.podiums)} tone="var(--tone-amber)" />
            <Rate label="Points finishes" value={rate(summary.pointsFinishes)} tone="var(--tone-green)" />
            <Rate label="Classified finishes" value={rate(Math.max(0, classified))} tone="var(--tone-blue)" />
          </ul>
        </Card>
        <TeammateCard season={season} driver={driver} />
        <Card title="Season details">
          <DetailList
            items={[
              {
                label: 'Avg. positions gained',
                value: summary.avgPositionsGained === null ? '—' : `${summary.avgPositionsGained > 0 ? '+' : ''}${summary.avgPositionsGained.toFixed(1)}`,
                hint: 'Grid minus finish, classified finishes only (RaceGrid derived).',
              },
              { label: 'Race points', value: formatPoints(summary.racePoints) },
              { label: 'Sprint points', value: formatPoints(summary.sprintPoints) },
              { label: 'DNF / DNS / DSQ', value: `${summary.dnf} / ${summary.dns} / ${summary.dsq}` },
            ]}
          />
        </Card>
      </div>
      <DriverResultsTable season={season} results={results} />
    </>
  );
}

/** One-paragraph description built from the season's numbers only (no invented facts, no pronouns). */
function biography(
  lastName: string,
  team: string,
  year: number,
  position: number | null,
  points: number | null,
  summary: DriverSummary,
  rounds: number,
): string {
  const standing = position ? `P${position} in the ${year} championship with ${formatPoints(points)} points` : `not yet classified in the ${year} championship`;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const results =
    summary.wins > 0
      ? `${plural(summary.wins, 'win')} and ${plural(summary.podiums, 'podium')}`
      : summary.podiums > 0
        ? `${plural(summary.podiums, 'podium')} so far`
        : summary.bestFinish
          ? `a best finish of P${summary.bestFinish}`
          : 'no classified finish yet';
  const gained = summary.avgPositionsGained;
  const racecraft =
    gained === null
      ? ''
      : ` On average ${lastName} ${gained >= 0 ? 'gains' : 'loses'} ${Math.abs(gained).toFixed(1)} places from the grid.`;
  return `${lastName} races for ${team} and is ${standing} after ${plural(rounds, 'round')}, with ${results}.${racecraft}`;
}

function formTone(result: string): 'win' | 'podium' | 'points' | 'none' | 'out' {
  if (!result.startsWith('P')) return 'out';
  const position = Number(result.slice(1));
  return position === 1 ? 'win' : position <= 3 ? 'podium' : position <= 10 ? 'points' : 'none';
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

function Rate({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <li className={styles.rate}>
      <span className={styles.rateHead}>
        <span>{label}</span>
        <span className="tabular">{Math.round(value * 100)}%</span>
      </span>
      <span className={styles.rateTrack} aria-hidden="true">
        <span className={styles.rateFill} style={{ width: `${value * 100}%`, background: tone }} />
      </span>
    </li>
  );
}
