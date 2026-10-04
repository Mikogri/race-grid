import type { Driver } from '../api/openf1/types';
import { UNKNOWN_TEAM_COLOR, teamColor } from '../lib/teams';

export interface DriverLabel {
  driverNumber: number;
  acronym: string;
  name: string;
  teamName: string;
  color: string;
  headshotUrl: string | null;
}

export type DriverLookup = Map<number, DriverLabel>;

/** Latest entry per driver number wins (drivers are fetched per session or meeting). */
export function driverLookup(drivers: Driver[] | undefined): DriverLookup {
  const map: DriverLookup = new Map();
  for (const d of drivers ?? []) {
    map.set(d.driver_number, {
      driverNumber: d.driver_number,
      acronym: d.name_acronym,
      name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.full_name,
      teamName: d.team_name ?? 'Unknown team',
      color: teamColor(d.team_colour),
      headshotUrl: d.headshot_url,
    });
  }
  return map;
}

export function labelFor(lookup: DriverLookup, driverNumber: number): DriverLabel {
  return lookup.get(driverNumber) ?? { driverNumber, acronym: `#${driverNumber}`, name: `Car ${driverNumber}`, teamName: '—', color: UNKNOWN_TEAM_COLOR, headshotUrl: null };
}
