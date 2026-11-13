// Builds a season model from raw OpenF1 lists. Pure functions — no fetching here.
import type {
  ChampionshipDriver,
  ChampionshipTeam,
  Driver,
  Meeting,
  Session,
  SessionResult,
  StartingGridEntry,
} from "../api/openf1/types";
import { slugify, teamColor } from "../lib/teams";
import { toMs } from "../lib/stats";

export type RoundStatus =
  "completed" | "in-progress" | "upcoming" | "cancelled";

export interface RoundInfo {
  meeting: Meeting;
  /** Official-style round number; null for testing and cancelled events. */
  round: number | null;
  isTesting: boolean;
  status: RoundStatus;
  sessions: Session[];
  race: Session | null;
  qualifying: Session | null;
  sprint: Session | null;
  sprintQualifying: Session | null;
}

export interface DriverInfo {
  driverNumber: number;
  acronym: string;
  fullName: string;
  firstName: string;
  lastName: string;
  teamName: string;
  teamSlug: string;
  color: string;
  headshotUrl: string | null;
  countryCode: string | null;
}

export interface TeamInfo {
  name: string;
  slug: string;
  color: string;
  driverNumbers: number[];
}

export type FinishStatus = "finished" | "dnf" | "dns" | "dsq" | "nc";

export interface DriverRoundResult {
  driverNumber: number;
  round: number;
  meetingKey: number;
  raceSessionKey: number;
  circuitKey: number;
  teamName: string;
  qualifyingPosition: number | null;
  /** Best qualifying lap that set the grid (OpenF1 starting_grid.lap_duration). */
  qualifyingLap: number | null;
  /** Best lap per qualifying phase [Q1, Q2, Q3] (OpenF1 session_result.duration). */
  qualifyingPhases: (number | null)[];
  grid: number | null;
  finish: number | null;
  status: FinishStatus;
  points: number;
  laps: number | null;
  sprintFinish: number | null;
  sprintPoints: number;
}

export interface StandingRow {
  position: number | null;
  points: number;
  positionStart: number | null;
  pointsStart: number | null;
}

export interface DriverStanding extends StandingRow {
  driverNumber: number;
}

export interface TeamStanding extends StandingRow {
  teamName: string;
}

export interface SeasonModel {
  year: number;
  rounds: RoundInfo[];
  /** Grand Prix rounds whose race has results, in calendar order. */
  completedRounds: RoundInfo[];
  drivers: Map<number, DriverInfo>;
  teams: Map<string, TeamInfo>;
  /** driver_number -> results per completed round (calendar order). */
  results: Map<number, DriverRoundResult[]>;
  driverStandings: DriverStanding[];
  teamStandings: TeamStanding[];
  /** Standings after each points-scoring session (race or sprint), in time order. */
  standingsHistory: {
    session: Session;
    round: number | null;
    drivers: ChampionshipDriver[];
    teams: ChampionshipTeam[];
  }[];
}

export interface SeasonRaw {
  year: number;
  meetings: Meeting[];
  sessions: Session[];
  drivers: Driver[];
  results: SessionResult[];
  grid: StartingGridEntry[];
  championshipDrivers: ChampionshipDriver[];
  championshipTeams: ChampionshipTeam[];
}

const findSession = (sessions: Session[], name: string) =>
  sessions.find((s) => s.session_name === name && !s.is_cancelled) ?? null;

function roundStatus(
  meeting: Meeting,
  race: Session | null,
  hasResults: boolean,
  now: number,
): RoundStatus {
  if (meeting.is_cancelled) return "cancelled";
  if (hasResults && race && toMs(race.date_end) < now) return "completed";
  if (
    toMs(meeting.date_start) <= now &&
    now <= toMs(meeting.date_end) + 6 * 3600_000
  )
    return "in-progress";
  return toMs(meeting.date_end) < now ? "completed" : "upcoming";
}

export function buildRounds(
  meetings: Meeting[],
  sessions: Session[],
  resultSessionKeys: Set<number>,
  now = Date.now(),
): RoundInfo[] {
  const byMeeting = new Map<number, Session[]>();
  for (const session of sessions) {
    const list = byMeeting.get(session.meeting_key) ?? [];
    list.push(session);
    byMeeting.set(session.meeting_key, list);
  }

  let round = 0;
  return [...meetings]
    .sort((a, b) => toMs(a.date_start) - toMs(b.date_start))
    .map((meeting) => {
      const meetingSessions = (byMeeting.get(meeting.meeting_key) ?? []).sort(
        (a, b) => toMs(a.date_start) - toMs(b.date_start),
      );
      const isTesting = /testing/i.test(meeting.meeting_name);
      const race = findSession(meetingSessions, "Race");
      const status = roundStatus(
        meeting,
        race,
        race ? resultSessionKeys.has(race.session_key) : false,
        now,
      );
      const counted = !isTesting && !meeting.is_cancelled;
      return {
        meeting,
        round: counted ? ++round : null,
        isTesting,
        status,
        sessions: meetingSessions,
        race,
        qualifying: findSession(meetingSessions, "Qualifying"),
        sprint: findSession(meetingSessions, "Sprint"),
        sprintQualifying:
          findSession(meetingSessions, "Sprint Qualifying") ??
          findSession(meetingSessions, "Sprint Shootout"),
      };
    });
}

function finishStatus(result: SessionResult | undefined): FinishStatus {
  if (!result) return "dns";
  if (result.dsq) return "dsq";
  if (result.dns) return "dns";
  if (result.dnf) return "dnf";
  return result.position == null ? "nc" : "finished";
}

function phaseTimes(result: SessionResult | undefined): (number | null)[] {
  const duration = result?.duration;
  return Array.isArray(duration) ? duration : [];
}

function toStanding<T extends ChampionshipDriver | ChampionshipTeam>(
  row: T,
): StandingRow {
  return {
    position: row.position_current,
    points: row.points_current ?? 0,
    positionStart: row.position_start,
    pointsStart: row.points_start,
  };
}

export function buildSeason(raw: SeasonRaw): SeasonModel {
  const resultSessionKeys = new Set(raw.results.map((r) => r.session_key));
  const rounds = buildRounds(raw.meetings, raw.sessions, resultSessionKeys);
  const sessionByKey = new Map(raw.sessions.map((s) => [s.session_key, s]));

  // Identity: the latest race/qualifying entry per driver wins (teams can change mid-season).
  const drivers = new Map<number, DriverInfo>();
  const teamOfDriverInSession = new Map<string, Driver>();
  const competitiveDrivers = raw.drivers
    .filter((d) => {
      const type = sessionByKey.get(d.session_key)?.session_type;
      return type === "Race" || type === "Qualifying";
    })
    .sort(
      (a, b) =>
        toMs(sessionByKey.get(a.session_key)?.date_start ?? "") -
        toMs(sessionByKey.get(b.session_key)?.date_start ?? ""),
    );
  for (const d of competitiveDrivers) {
    teamOfDriverInSession.set(`${d.session_key}:${d.driver_number}`, d);
    const teamName = d.team_name ?? "Unknown team";
    drivers.set(d.driver_number, {
      driverNumber: d.driver_number,
      acronym: d.name_acronym,
      fullName:
        [d.first_name, d.last_name].filter(Boolean).join(" ") || d.full_name,
      firstName: d.first_name ?? "",
      lastName: d.last_name ?? d.full_name,
      teamName,
      teamSlug: slugify(teamName),
      color: teamColor(d.team_colour),
      headshotUrl: d.headshot_url,
      countryCode: d.country_code,
    });
  }

  const teams = new Map<string, TeamInfo>();
  for (const driver of drivers.values()) {
    const team = teams.get(driver.teamName) ?? {
      name: driver.teamName,
      slug: driver.teamSlug,
      color: driver.color,
      driverNumbers: [],
    };
    team.driverNumbers.push(driver.driverNumber);
    teams.set(driver.teamName, team);
  }

  const resultsBySession = new Map<number, Map<number, SessionResult>>();
  for (const r of raw.results) {
    const map =
      resultsBySession.get(r.session_key) ?? new Map<number, SessionResult>();
    map.set(r.driver_number, r);
    resultsBySession.set(r.session_key, map);
  }
  const gridBySession = new Map<number, Map<number, StartingGridEntry>>();
  for (const g of raw.grid) {
    const map =
      gridBySession.get(g.session_key) ?? new Map<number, StartingGridEntry>();
    map.set(g.driver_number, g);
    gridBySession.set(g.session_key, map);
  }

  const completedRounds = rounds.filter(
    (r) =>
      r.round !== null && r.race && resultsBySession.has(r.race.session_key),
  );
  const results = new Map<number, DriverRoundResult[]>();
  for (const round of completedRounds) {
    const race = round.race;
    if (!race || round.round === null) continue;
    const raceResults =
      resultsBySession.get(race.session_key) ??
      new Map<number, SessionResult>();
    const qualiResults = round.qualifying
      ? resultsBySession.get(round.qualifying.session_key)
      : undefined;
    const grid = round.qualifying
      ? gridBySession.get(round.qualifying.session_key)
      : undefined;
    const sprintResults = round.sprint
      ? resultsBySession.get(round.sprint.session_key)
      : undefined;

    for (const [driverNumber, result] of raceResults) {
      const entry = teamOfDriverInSession.get(
        `${race.session_key}:${driverNumber}`,
      );
      const list = results.get(driverNumber) ?? [];
      const sprint = sprintResults?.get(driverNumber);
      list.push({
        driverNumber,
        round: round.round,
        meetingKey: round.meeting.meeting_key,
        raceSessionKey: race.session_key,
        circuitKey: round.meeting.circuit_key,
        teamName:
          entry?.team_name ??
          drivers.get(driverNumber)?.teamName ??
          "Unknown team",
        qualifyingPosition: qualiResults?.get(driverNumber)?.position ?? null,
        qualifyingLap: grid?.get(driverNumber)?.lap_duration ?? null,
        qualifyingPhases: phaseTimes(qualiResults?.get(driverNumber)),
        grid: grid?.get(driverNumber)?.position ?? null,
        finish: result.position,
        status: finishStatus(result),
        points: result.points ?? 0,
        laps: result.number_of_laps,
        sprintFinish: sprint?.position ?? null,
        sprintPoints: sprint?.points ?? 0,
      });
      results.set(driverNumber, list);
    }
  }

  // Championship tables after each race / sprint, ordered by session time.
  const pointsSessions = [
    ...new Set(raw.championshipDrivers.map((c) => c.session_key)),
  ]
    .map((key) => sessionByKey.get(key))
    .filter((s): s is Session => Boolean(s))
    .sort((a, b) => toMs(a.date_start) - toMs(b.date_start));
  const roundByMeeting = new Map(
    rounds.map((r) => [r.meeting.meeting_key, r.round]),
  );
  const standingsHistory = pointsSessions.map((session) => ({
    session,
    round: roundByMeeting.get(session.meeting_key) ?? null,
    drivers: raw.championshipDrivers.filter(
      (c) => c.session_key === session.session_key,
    ),
    teams: raw.championshipTeams.filter(
      (c) => c.session_key === session.session_key,
    ),
  }));
  const latest = standingsHistory[standingsHistory.length - 1];
  const latestTeams = [...standingsHistory]
    .reverse()
    .find((h) => h.teams.length > 0);

  const byPosition = (a: StandingRow, b: StandingRow) =>
    (a.position ?? 99) - (b.position ?? 99) || b.points - a.points;

  return {
    year: raw.year,
    rounds,
    completedRounds,
    drivers,
    teams,
    results,
    driverStandings: (latest?.drivers ?? [])
      .map((row) => ({ driverNumber: row.driver_number, ...toStanding(row) }))
      .sort(byPosition),
    teamStandings: (latestTeams?.teams ?? [])
      .map((row) => ({ teamName: row.team_name, ...toStanding(row) }))
      .sort(byPosition),
    standingsHistory,
  };
}
