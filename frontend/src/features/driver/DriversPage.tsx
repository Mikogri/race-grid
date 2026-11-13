import { Link } from "react-router";
import type { SeasonModel } from "../../analytics/season";
import { useSelectedSeason } from "../../app/seasons";
import { Avatar } from "../../components/ui/Avatar";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, ErrorState } from "../../components/ui/StateViews";
import { PageSkeleton } from "../../components/ui/PageSkeleton";
import { TeamMarker } from "../../components/ui/TeamMarker";
import { useSeason } from "../../data/season";
import { driverCountry } from "../../lib/countries";
import { formatPoints } from "../../lib/format";
import styles from "./DriversPage.module.css";

/** Drivers (menu: Race → Drivers): the season's grid in championship order; each card opens the driver page. */
export function DriversPage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);
  return (
    <>
      <PageHeader
        title={`${year} Drivers`}
        description="Every driver on the grid this season, in championship order."
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending || !season ? (
        <PageSkeleton layout="cards" />
      ) : season.drivers.size === 0 ? (
        <EmptyState title="No drivers yet">
          OpenF1 lists drivers once the first session of the season has run.
        </EmptyState>
      ) : (
        <DriverGrid season={season} />
      )}
    </>
  );
}

function DriverGrid({ season }: { season: SeasonModel }) {
  const standings = new Map(
    season.driverStandings.map((s) => [s.driverNumber, s]),
  );
  const order = (n: number) =>
    standings.get(n)?.position ?? Number.MAX_SAFE_INTEGER;
  const drivers = [...season.drivers.values()].sort(
    (a, b) =>
      order(a.driverNumber) - order(b.driverNumber) ||
      a.lastName.localeCompare(b.lastName),
  );
  return (
    <ul className={styles.grid}>
      {drivers.map((driver) => {
        const standing = standings.get(driver.driverNumber);
        return (
          <li key={driver.driverNumber}>
            <Link
              to={`/drivers/${season.year}/${driver.driverNumber}`}
              className={styles.card}
            >
              <Avatar
                src={driver.headshotUrl}
                name={driver.fullName}
                size="lg"
                ring={driver.color}
              />
              <span className={styles.text}>
                <span className={styles.name}>{driver.fullName}</span>
                <span className={styles.team}>
                  <TeamMarker color={driver.color} />
                  {driver.teamName}
                </span>
                <span className={styles.meta}>
                  #{driver.driverNumber} ·{" "}
                  {driverCountry(driver) ?? "Country unknown"}
                </span>
              </span>
              <span className={styles.stats}>
                <span className={styles.position}>
                  {standing?.position ? `P${standing.position}` : "—"}
                </span>
                <span className={`${styles.meta} tabular`}>
                  {standing ? `${formatPoints(standing.points)} p` : "—"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
