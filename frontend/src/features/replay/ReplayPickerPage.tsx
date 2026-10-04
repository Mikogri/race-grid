import { IconListDetails, IconPlayerPlayFilled } from '@tabler/icons-react';
import type { SeasonModel } from '../../analytics/season';
import { useSelectedSeason } from '../../app/seasons';
import { ButtonLink } from '../../components/ui/Button';
import { CircuitCard } from '../../components/CircuitCard';
import cardStyles from '../../components/CircuitCard.module.css';
import { RoundStatusBadge } from '../../components/RoundStatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { useCircuitsByKey } from '../../data/circuits';
import { useSeason } from '../../data/season';
import { formatDate } from '../../lib/format';

/** Full name of the Grand Prix winner of a round, from the season results. */
function winnerOf(season: SeasonModel, round: number | null): string | null {
  for (const [driverNumber, results] of season.results) {
    if (results.some((r) => r.round === round && r.finish === 1)) return season.drivers.get(driverNumber)?.fullName ?? `#${driverNumber}`;
  }
  return null;
}

/** Entry point of Race Replay: every finished race of the selected season, as cards (open the replay or the round). */
export function ReplayPickerPage() {
  const { year } = useSelectedSeason();
  const { season, isPending, error, refetch } = useSeason(year);
  const circuits = useCircuitsByKey();
  const rounds = [...(season?.completedRounds ?? [])].reverse();
  const latest = rounds[0];

  return (
    <>
      <PageHeader
        title="Race Replay"
        meta={[
          { label: 'Season', value: year },
          { label: 'Races available', value: season ? rounds.length : '—' },
        ]}
        actions={
          latest?.race && (
            <ButtonLink to={`/replay/${latest.race.session_key}`} variant="primary" icon={<IconPlayerPlayFilled size={16} aria-hidden="true" />}>
              Replay latest: {latest.meeting.location}
            </ButtonLink>
          )
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending || !season ? (
        <PageSkeleton layout="cards" />
      ) : rounds.length === 0 ? (
        <EmptyState title={`No finished races in ${year} yet`} />
      ) : (
        <div className={`${cardStyles.grid} rg-stagger`}>
          {rounds.map((round) => {
            const winner = winnerOf(season, round.round);
            return (
              <CircuitCard
                key={round.meeting.meeting_key}
                to={`/rounds/${round.meeting.meeting_key}`}
                outline={circuits.byKey.get(round.meeting.circuit_key)?.outline ?? null}
                flag={round.meeting.country_flag}
                eyebrow={`Round ${round.round}`}
                badge={<RoundStatusBadge status={round.status} />}
                title={round.meeting.meeting_name}
                subtitle={`${round.meeting.circuit_short_name} · ${round.meeting.country_name}`}
                facts={[
                  { label: 'Race day', value: round.race ? formatDate(round.race.date_start) : '—' },
                  { label: 'Winner', value: winner ?? '—' },
                  { label: 'Format', value: round.sprint ? 'Sprint' : 'Standard' },
                ]}
                actions={
                  <>
                    {round.race && (
                      <ButtonLink to={`/replay/${round.race.session_key}`} variant="secondary" icon={<IconPlayerPlayFilled size={14} aria-hidden="true" />}>
                        Open replay
                      </ButtonLink>
                    )}
                    <ButtonLink to={`/rounds/${round.meeting.meeting_key}`} variant="ghost" icon={<IconListDetails size={15} stroke={1.5} aria-hidden="true" />}>
                      Details
                    </ButtonLink>
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}
