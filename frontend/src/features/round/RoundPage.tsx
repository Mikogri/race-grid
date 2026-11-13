import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import type { Session } from "../../api/openf1/types";
import { RoundStatusBadge } from "../../components/RoundStatusBadge";
import { ButtonLink } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Segmented } from "../../components/ui/Segmented";
import { EmptyState, ErrorState } from "../../components/ui/StateViews";
import { PageSkeleton } from "../../components/ui/PageSkeleton";
import { Tabs, type TabItem } from "../../components/ui/Tabs";
import { TrackOutline } from "../../components/ui/TrackOutline";
import { useCircuitsByKey } from "../../data/circuits";
import { useMeeting } from "../../data/meeting";
import { useSeason } from "../../data/season";
import { formatDateRange } from "../../lib/format";
import { toMs } from "../../lib/stats";
import { GridFinishTab } from "./GridFinishTab";
import { LapsTab } from "./LapsTab";
import { OvertakesTab } from "./OvertakesTab";
import { RaceControlTab } from "./RaceControlTab";
import { RoundSummary } from "./RoundSummary";
import { SessionResultsTab } from "./SessionResultsTab";
import { StrategyTab } from "./StrategyTab";
import { WeatherTab } from "./WeatherTab";
import styles from "./RoundPage.module.css";

type TabId =
  | "results"
  | "grid"
  | "laps"
  | "strategy"
  | "control"
  | "weather"
  | "overtakes";

const SHORT_NAMES: Record<string, string> = {
  "Practice 1": "FP1",
  "Practice 2": "FP2",
  "Practice 3": "FP3",
  "Sprint Qualifying": "Sprint Quali",
  "Sprint Shootout": "Shootout",
  Qualifying: "Qualifying",
};

const isRaceLike = (s: Session | undefined) => s?.session_type === "Race";

export function RoundPage() {
  const meetingKey = Number(useParams().meetingKey);
  const [searchParams, setSearchParams] = useSearchParams();
  const { meeting, sessions, drivers } = useMeeting(meetingKey);
  const { season } = useSeason(meeting.data?.year ?? 0);
  const circuits = useCircuitsByKey();
  const [now] = useState(() => Date.now());

  const error = meeting.error ?? sessions.error;
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={() =>
          void Promise.all([meeting.refetch(), sessions.refetch()])
        }
      />
    );
  if (meeting.isPending || sessions.isPending)
    return <PageSkeleton layout="detail" header />;
  if (!meeting.data)
    return (
      <EmptyState title="Unknown round">
        OpenF1 has no meeting with key {meetingKey}.
      </EmptyState>
    );

  const finished = (sessions.data ?? []).filter(
    (s) => !s.is_cancelled && toMs(s.date_end) < now,
  );
  const race = finished.find((s) => s.session_name === "Race");
  const requested = finished.find(
    (s) => String(s.session_key) === searchParams.get("session"),
  );
  const session = requested ?? race ?? finished[finished.length - 1];
  const tab = (searchParams.get("tab") as TabId | null) ?? "results";

  const update = (patch: Record<string, string>) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => next.set(k, v));
        return next;
      },
      { replace: true },
    );

  const round = season?.rounds.find(
    (r) => r.meeting.meeting_key === meetingKey,
  );
  const circuit = circuits.byKey.get(meeting.data.circuit_key);
  const lookup = drivers.data ?? new Map();

  const tabs: TabItem<TabId>[] = [
    { id: "results", label: "Results" },
    { id: "grid", label: "Grid to finish", disabled: !isRaceLike(session) },
    { id: "laps", label: "Laps & Sectors" },
    { id: "strategy", label: "Stints & Pit stops" },
    { id: "control", label: "Race control" },
    { id: "weather", label: "Weather" },
    { id: "overtakes", label: "Overtakes", disabled: !isRaceLike(session) },
  ];
  const activeTab =
    tabs.find((t) => t.id === tab && !t.disabled)?.id ?? "results";

  return (
    <>
      <PageHeader
        crumbs={[{ to: "/calendar", label: "Calendar" }]}
        leading={
          circuit?.outline ? (
            <div className={styles.thumb}>
              <TrackOutline
                outline={circuit.outline}
                variant="thumb"
                title={`${circuit.name} outline`}
              />
            </div>
          ) : undefined
        }
        title={meeting.data.meeting_name}
        meta={[
          { label: "Round", value: round?.round ?? "—" },
          {
            label: "Dates",
            value: formatDateRange(
              meeting.data.date_start,
              meeting.data.date_end,
            ),
          },
          {
            label: "Circuit",
            value: `${meeting.data.circuit_short_name}, ${meeting.data.country_name}`,
          },
          {
            label: "Status",
            value: round ? <RoundStatusBadge status={round.status} /> : "—",
          },
        ]}
        actions={
          race && (
            <ButtonLink
              to={`/replay/${race.session_key}`}
              variant="primary"
              icon={<IconPlayerPlayFilled size={15} aria-hidden="true" />}
            >
              Open Race Replay
            </ButtonLink>
          )
        }
      >
        {race && (
          <RoundSummary
            race={race}
            qualifying={finished.find((s) => s.session_name === "Qualifying")}
            lookup={lookup}
          />
        )}
      </PageHeader>
      {!session ? (
        <EmptyState title="No finished sessions yet">
          Results appear here once OpenF1 publishes the first session of this
          weekend.
        </EmptyState>
      ) : (
        <Panel
          toolbar={
            <>
              <Tabs
                label="Round data"
                items={tabs}
                value={activeTab}
                onChange={(id) => update({ tab: id })}
              />
              <Segmented
                label="Session"
                options={finished.map((s) => ({
                  value: s.session_key,
                  label: SHORT_NAMES[s.session_name] ?? s.session_name,
                }))}
                value={session.session_key}
                onChange={(key) => update({ session: String(key) })}
              />
            </>
          }
        >
          {activeTab === "results" && (
            <SessionResultsTab session={session} lookup={lookup} />
          )}
          {activeTab === "grid" && (
            <GridFinishTab race={session} sessions={finished} lookup={lookup} />
          )}
          {activeTab === "laps" && (
            <LapsTab session={session} lookup={lookup} />
          )}
          {activeTab === "strategy" && (
            <StrategyTab session={session} lookup={lookup} />
          )}
          {activeTab === "control" && (
            <RaceControlTab session={session} lookup={lookup} />
          )}
          {activeTab === "weather" && <WeatherTab session={session} />}
          {activeTab === "overtakes" && (
            <OvertakesTab session={session} lookup={lookup} />
          )}
        </Panel>
      )}
    </>
  );
}
