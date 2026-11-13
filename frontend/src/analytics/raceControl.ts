// Safety car / VSC / red flag periods reconstructed from OpenF1 race_control messages.
import type { RaceControlMessage } from "../api/openf1/types";
import { toMs } from "../lib/stats";

export type NeutralisationKind = "SC" | "VSC" | "RED";

export interface Neutralisation {
  kind: NeutralisationKind;
  startMs: number;
  /** When the period ended; SC "in this lap" is taken as the end (the car peels off within that lap). */
  endMs: number | null;
  startLap: number | null;
}

function kindOf(
  message: RaceControlMessage,
): { kind: NeutralisationKind; edge: "start" | "end" } | null {
  const text = message.message.toUpperCase();
  if (message.category === "Flag" && message.flag === "RED")
    return { kind: "RED", edge: "start" };
  if (message.category !== "SafetyCar" && !text.includes("SAFETY CAR"))
    return null;
  const virtual = text.includes("VIRTUAL");
  if (text.includes("DEPLOYED"))
    return { kind: virtual ? "VSC" : "SC", edge: "start" };
  if (text.includes("ENDING") || text.includes("IN THIS LAP"))
    return { kind: virtual ? "VSC" : "SC", edge: "end" };
  return null;
}

export function neutralisations(
  messages: RaceControlMessage[],
): Neutralisation[] {
  const sorted = [...messages].sort((a, b) => toMs(a.date) - toMs(b.date));
  const periods: Neutralisation[] = [];
  const open = new Map<NeutralisationKind, Neutralisation>();
  for (const message of sorted) {
    const found = kindOf(message);
    if (found) {
      const current = open.get(found.kind);
      if (found.edge === "start" && !current) {
        // A VSC upgraded to a full safety car ends when the SC is deployed.
        const vsc = open.get("VSC");
        if (found.kind === "SC" && vsc) {
          vsc.endMs = toMs(message.date);
          open.delete("VSC");
        }
        const period: Neutralisation = {
          kind: found.kind,
          startMs: toMs(message.date),
          endMs: null,
          startLap: message.lap_number,
        };
        periods.push(period);
        open.set(found.kind, period);
      } else if (found.edge === "end" && current) {
        current.endMs = toMs(message.date);
        open.delete(found.kind);
      }
      continue;
    }
    // The chequered flag closes anything still open (no explicit end message was published).
    if (message.category === "Flag" && message.flag === "CHEQUERED") {
      for (const period of open.values()) period.endMs = toMs(message.date);
      open.clear();
      continue;
    }
    // A red flag ends when the session resumes (green light / track clear message).
    const red = open.get("RED");
    if (
      red &&
      message.category === "Flag" &&
      (message.flag === "GREEN" || message.flag === "CLEAR") &&
      message.scope === "Track"
    ) {
      red.endMs = toMs(message.date);
      open.delete("RED");
    }
  }
  return periods;
}

export function isNeutralisedAt(
  periods: Neutralisation[],
  ms: number,
): NeutralisationKind | null {
  for (const p of periods)
    if (ms >= p.startMs && (p.endMs === null || ms <= p.endMs)) return p.kind;
  return null;
}
