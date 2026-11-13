import styles from "./PositionChange.module.css";

/** ▲2 / ▼1 / – between two positions (lower number = better). */
export function PositionChange({
  from,
  to,
}: {
  from: number | null;
  to: number | null;
}) {
  if (from == null || to == null || from === to)
    return <span className={styles.same}>–</span>;
  const gained = from - to;
  return (
    <span
      className={gained > 0 ? styles.up : styles.down}
      aria-label={gained > 0 ? `Up ${gained}` : `Down ${-gained}`}
    >
      {gained > 0 ? "▲" : "▼"}
      {Math.abs(gained)}
    </span>
  );
}
