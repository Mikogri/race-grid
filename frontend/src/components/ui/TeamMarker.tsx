import styles from "./TeamMarker.module.css";

/** Team colour as a small vertical bar. Team colours are never used for large surfaces. */
export function TeamMarker({
  color,
  size = "sm",
}: {
  color: string;
  size?: "xs" | "sm" | "lg";
}) {
  return (
    <span
      className={`${styles.marker} ${styles[size]}`}
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

export function DriverTag({
  acronym,
  color,
  name,
}: {
  acronym: string;
  color: string;
  name?: string;
}) {
  return (
    <span className={styles.driver}>
      <TeamMarker color={color} />
      <span className={styles.acronym}>{acronym}</span>
      {name && <span className={styles.name}>{name}</span>}
    </span>
  );
}
