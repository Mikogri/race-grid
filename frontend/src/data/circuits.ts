// Local circuit library (generated from RaceGrid_Tracks by scripts/build-circuits.mjs).
// Static UI data only — never a substitute for OpenF1 results.
import { useQuery } from "@tanstack/react-query";

export type CircuitYearStatus = "ready" | "cancelled" | "no_historical_session";

export interface CircuitMeetingInfo {
  meetingKey: number;
  meetingName: string;
  officialName: string;
  location: string;
  countryName: string;
  countryCode: string;
  circuitShortName: string;
  circuitType: string;
  gmtOffset: string;
}

export interface CircuitSummary {
  circuitKey: number;
  slug: string;
  name: string;
  years: { year: number; status: CircuitYearStatus; reason?: string }[];
  readyYears: number[];
  meeting: CircuitMeetingInfo | null;
  /** SVG path (viewBox 0 0 1000 1000) of the newest ready year, or null when no outline exists. */
  outline: string | null;
  outlineYear: number | null;
}

export interface CircuitTransform {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  rotationDegrees: number;
}

export interface CircuitYear {
  circuitKey: number;
  year: number;
  meeting: CircuitMeetingInfo;
  reference: {
    sessionKey: number;
    sessionName: string;
    driverNumber: number;
    lapNumber: number;
    lapDuration: number;
    lapDateStart: string;
    sectorSeconds: [number | null, number | null, number | null];
    speedTrap: { i1: number | null; i2: number | null; st: number | null };
  };
  transform: CircuitTransform;
  viewBox: [number, number, number, number];
  outline: string;
  sectors: [string, string, string];
  gates: {
    type: "START" | "S1_END" | "S2_END" | "FINISH";
    x: number;
    y: number;
    progress: number;
  }[];
  /** [svgX, svgY, progress 0..1] along the reference lap. */
  points: [number, number, number][];
  quality: { pointCount: number; checksPassed: boolean };
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(`Local circuit data missing: ${url} (${response.status})`);
  return (await response.json()) as T;
}

export function useCircuitIndex() {
  return useQuery({
    queryKey: ["local", "circuits"],
    queryFn: ({ signal }) =>
      getJson<{ circuits: CircuitSummary[] }>("/circuits/index.json", signal),
    select: (data) => data.circuits,
    staleTime: Infinity,
  });
}

/** Map OpenF1 circuit_key -> local summary. */
export function useCircuitsByKey() {
  const query = useCircuitIndex();
  const byKey = new Map((query.data ?? []).map((c) => [c.circuitKey, c]));
  return { ...query, byKey };
}

export function useCircuitYear(
  slug: string | undefined,
  year: number | undefined,
) {
  return useQuery({
    queryKey: ["local", "circuit", slug, year],
    queryFn: ({ signal }) =>
      getJson<CircuitYear>(`/circuits/${slug}/${year}.json`, signal),
    enabled: Boolean(slug && year),
    staleTime: Infinity,
  });
}

/** OpenF1 x/y -> SVG coordinates of the circuit-year outline. */
export function toSvg(
  transform: CircuitTransform,
  x: number,
  y: number,
): [number, number] {
  return [
    x * transform.scaleX + transform.translateX,
    y * transform.scaleY + transform.translateY,
  ];
}
