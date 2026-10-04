import { createContext, useContext } from 'react';

/** OpenF1 historical coverage starts in 2023. */
export const FIRST_SEASON = 2023;
export const CURRENT_SEASON = new Date().getUTCFullYear();
export const SEASONS = Array.from({ length: CURRENT_SEASON - FIRST_SEASON + 1 }, (_, i) => CURRENT_SEASON - i);

export interface SeasonContextValue {
  year: number;
  setYear: (year: number) => void;
}

export const SeasonContext = createContext<SeasonContextValue | null>(null);

export function useSelectedSeason(): SeasonContextValue {
  const value = useContext(SeasonContext);
  if (!value) throw new Error('useSelectedSeason must be used inside SeasonProvider');
  return value;
}
