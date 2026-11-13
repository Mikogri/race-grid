// Raw OpenF1 response shapes (https://openf1.org/docs/). Field names are kept as returned by the API.

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  country_flag: string | null;
  circuit_key: number;
  circuit_short_name: string;
  circuit_type: string;
  gmt_offset: string;
  date_start: string;
  date_end: string;
  year: number;
  is_cancelled: boolean;
}

export type SessionType = "Practice" | "Qualifying" | "Race";

export interface Session {
  session_key: number;
  session_type: SessionType;
  /** e.g. "Practice 1", "Sprint Qualifying", "Sprint", "Race", "Day 1" (testing) */
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_name: string;
  location: string;
  gmt_offset: string;
  year: number;
  is_cancelled: boolean;
}

export interface Driver {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string | null;
  team_colour: string | null;
  first_name: string | null;
  last_name: string | null;
  headshot_url: string | null;
  country_code: string | null;
}

export interface SessionResult {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number | null;
  number_of_laps: number | null;
  points?: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  /** Race: total time (s). Qualifying: array of Q1/Q2/Q3 best laps. */
  duration: number | (number | null)[] | null;
  /** Race: seconds or "+N LAP(S)". Qualifying: array per phase. */
  gap_to_leader: number | string | (number | string | null)[] | null;
}

export interface StartingGridEntry {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
  lap_duration: number | null;
}

export interface ChampionshipDriver {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position_start: number | null;
  position_current: number | null;
  points_start: number | null;
  points_current: number | null;
}

export interface ChampionshipTeam {
  session_key: number;
  meeting_key: number;
  team_name: string;
  position_start: number | null;
  position_current: number | null;
  points_start: number | null;
  points_current: number | null;
}

export interface Lap {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  is_pit_out_lap: boolean;
  lap_duration: number | null;
  segments_sector_1: (number | null)[] | null;
  segments_sector_2: (number | null)[] | null;
  segments_sector_3: (number | null)[] | null;
}

export interface PositionRecord {
  session_key: number;
  driver_number: number;
  date: string;
  position: number;
}

export interface IntervalRecord {
  session_key: number;
  driver_number: number;
  date: string;
  /** Seconds, or a string such as "+1 LAP" when lapped. */
  gap_to_leader: number | string | null;
  interval: number | string | null;
}

export interface LocationRecord {
  session_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface CarDataRecord {
  session_key: number;
  driver_number: number;
  date: string;
  speed: number;
  n_gear: number;
  throttle: number;
  brake: number;
  drs: number | null;
  rpm: number;
}

export type TyreCompound =
  | "SOFT"
  | "MEDIUM"
  | "HARD"
  | "INTERMEDIATE"
  | "WET"
  | "UNKNOWN"
  | "TEST_UNKNOWN";

export interface Stint {
  session_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number | null;
  lap_end: number | null;
  compound: TyreCompound | null;
  tyre_age_at_start: number | null;
}

export interface PitStop {
  session_key: number;
  driver_number: number;
  date: string;
  lap_number: number;
  /** Time in the pit lane (s). */
  lane_duration: number | null;
  /** Stationary time (s); often null in older data. */
  stop_duration: number | null;
  pit_duration: number | null;
}

export interface Overtake {
  session_key: number;
  date: string;
  overtaking_driver_number: number;
  overtaken_driver_number: number;
  position: number;
}

export interface RaceControlMessage {
  session_key: number;
  date: string;
  driver_number: number | null;
  lap_number: number | null;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  message: string;
}

export interface WeatherRecord {
  session_key: number;
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_direction: number;
  wind_speed: number;
}

export interface TeamRadio {
  session_key: number;
  driver_number: number;
  date: string;
  recording_url: string;
}
