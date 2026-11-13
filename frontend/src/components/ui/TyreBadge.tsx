import type { TyreCompound } from "../../api/openf1/types";
import { tyreColor } from "../../lib/tyres";
import styles from "./TyreBadge.module.css";

const LETTER: Record<string, string> = {
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
  INTERMEDIATE: "I",
  WET: "W",
};

/** Tyre ring in the compound colour with its initial; the stint age follows unless `showAge` is off (it stays in the tooltip). */
export function TyreBadge({
  compound,
  age,
  showAge = true,
}: {
  compound: TyreCompound | null | undefined;
  age?: number | null;
  showAge?: boolean;
}) {
  const letter = compound ? (LETTER[compound] ?? "?") : "?";
  return (
    <span
      className={styles.wrap}
      title={`${compound ?? "Unknown"} tyre${age != null ? `, ${age} laps old` : ""}`}
    >
      <span
        className={styles.tyre}
        style={{ borderColor: tyreColor(compound) }}
      >
        {letter}
      </span>
      {showAge && age != null && <span className={styles.age}>{age}</span>}
    </span>
  );
}
