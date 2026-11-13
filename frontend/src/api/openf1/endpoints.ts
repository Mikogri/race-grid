import {
  HOUR,
  IMMUTABLE,
  MINUTE,
  openf1,
  type OpenF1Params,
  type RequestOptions,
} from "./client";
import type {
  CarDataRecord,
  ChampionshipDriver,
  ChampionshipTeam,
  Driver,
  IntervalRecord,
  Lap,
  LocationRecord,
  Meeting,
  Overtake,
  PitStop,
  PositionRecord,
  RaceControlMessage,
  Session,
  SessionResult,
  StartingGridEntry,
  Stint,
  TeamRadio,
  WeatherRecord,
} from "./types";

interface Endpoints {
  meetings: Meeting;
  sessions: Session;
  drivers: Driver;
  session_result: SessionResult;
  starting_grid: StartingGridEntry;
  championship_drivers: ChampionshipDriver;
  championship_teams: ChampionshipTeam;
  laps: Lap;
  position: PositionRecord;
  intervals: IntervalRecord;
  location: LocationRecord;
  car_data: CarDataRecord;
  stints: Stint;
  pit: PitStop;
  overtakes: Overtake;
  race_control: RaceControlMessage;
  weather: WeatherRecord;
  team_radio: TeamRadio;
}

export type Endpoint = keyof Endpoints;

export function fetchOpenF1<E extends Endpoint>(
  endpoint: E,
  params: OpenF1Params,
  options: RequestOptions,
): Promise<Endpoints[E][]> {
  return openf1<Endpoints[E]>(endpoint, params, options);
}

/** Sessions that ended more than a few hours ago are final in OpenF1; before that data may still change. */
export function ttlForSessionEnd(dateEnd: string | null | undefined): number {
  if (!dateEnd) return MINUTE;
  return Date.now() - new Date(dateEnd).getTime() > 6 * HOUR
    ? IMMUTABLE
    : MINUTE;
}

/** Season-wide lists: past seasons are final, the running season is refreshed every 15 minutes. */
export function ttlForSeason(year: number): number {
  return year < new Date().getUTCFullYear() ? IMMUTABLE : 15 * MINUTE;
}
