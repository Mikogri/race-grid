import { useState, type ReactNode } from 'react';
import { CURRENT_SEASON, SEASONS, SeasonContext } from './seasons';

const STORAGE_KEY = 'racegrid.season';

function readStoredSeason(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return SEASONS.includes(stored) ? stored : CURRENT_SEASON;
  } catch {
    // Storage blocked (privacy mode): fall back to the current season.
    return CURRENT_SEASON;
  }
}

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState(readStoredSeason);
  const setYear = (next: number) => {
    setYearState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch (error) {
      console.warn('RaceGrid: could not persist season selection', error);
    }
  };
  return <SeasonContext value={{ year, setYear }}>{children}</SeasonContext>;
}
