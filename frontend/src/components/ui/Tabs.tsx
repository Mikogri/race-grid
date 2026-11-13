import { useId, type KeyboardEvent, type ReactNode } from "react";
import { useSlidingIndicator } from "./useSlidingIndicator";
import styles from "./Tabs.module.css";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
  /** Leading icon (Tabler, stroke 1.5). */
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** 'lg': 36 px tabs with 13 px labels (workspace panels). */
  size?: "md" | "lg";
}

/** Text tabs; a white pill marks the active one. Arrow keys move between tabs. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "md",
}: TabsProps<T>) {
  const id = useId();
  const { containerRef, indicatorStyle } =
    useSlidingIndicator<HTMLDivElement>(value);
  const enabled = items.filter((item) => !item.disabled);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = enabled.findIndex((item) => item.id === value);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = enabled[(index + step + enabled.length) % enabled.length];
    if (next) {
      onChange(next.id);
      document.getElementById(`${id}-${next.id}`)?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={size === "lg" ? `${styles.tabs} ${styles.lg}` : styles.tabs}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <span
        className={styles.indicator}
        style={indicatorStyle}
        aria-hidden="true"
      />
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            id={`${id}-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            data-active={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            className={selected ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
