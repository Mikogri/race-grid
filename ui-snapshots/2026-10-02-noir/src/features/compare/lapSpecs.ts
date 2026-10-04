export interface LapSpec {
  sessionKey: number;
  driver: number;
  lap: number;
}

export const MAX_LAPS = 4;

/** URL format: laps=sessionKey.driver.lap,… so comparisons can be shared. */
export function parseSpecs(value: string | null): LapSpec[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.split('.').map(Number))
    .filter((parts) => parts.length === 3 && parts.every(Number.isFinite))
    .map(([sessionKey, driver, lap]) => ({ sessionKey, driver, lap }))
    .slice(0, MAX_LAPS);
}

export const specsToParam = (specs: LapSpec[]) => specs.map((s) => `${s.sessionKey}.${s.driver}.${s.lap}`).join(',');

export const specKey = (s: LapSpec) => `${s.sessionKey}.${s.driver}.${s.lap}`;

/** Distinct comparison colours (team colours clash when teammates or seasons are compared). */
export const TRACE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
