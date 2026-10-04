import { useState } from 'react';

const STORAGE_KEY = 'racegrid.replay.analysisHeight';
function readHeight(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return value > 0 ? value : null;
  } catch {
    // Storage blocked: start from the CSS default.
    return null;
  }
}

/** Height of the replay analysis panel chosen by the user (null = CSS default), remembered across visits. */
export function useAnalysisHeight() {
  const [height, setHeight] = useState(readHeight);
  const save = (value: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.round(value)));
    } catch (error) {
      console.warn('RaceGrid: could not persist the replay panel height', error);
    }
  };
  return { height, setHeight, save };
}
