import { useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconInfoHexagonFilled } from "@tabler/icons-react";
import styles from "./Tooltip.module.css";

/** Keeps the bubble (max 260 px wide) inside the window. */
const EDGE = 140;

/**
 * Frosted tooltip above its trigger, on hover and keyboard focus. Rendered in a portal so panels
 * that clip their content (overflow: clip) never cut it off.
 */
export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  const id = useId();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const x = Math.min(
      Math.max(rect.left + rect.width / 2, EDGE),
      window.innerWidth - EDGE,
    );
    setAnchor({ x, y: rect.top });
  };
  const hide = () => setAnchor(null);

  return (
    <>
      <span
        className={styles.trigger}
        tabIndex={0}
        aria-label={content}
        aria-describedby={anchor ? id : undefined}
        onPointerEnter={(event) => show(event.currentTarget)}
        onPointerLeave={hide}
        onFocus={(event) => show(event.currentTarget)}
        onBlur={hide}
      >
        {children}
      </span>
      {anchor &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className={styles.tooltip}
            style={{ left: anchor.x, top: anchor.y }}
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
}

/** Muted "i" icon that explains a figure or a method in a tooltip. */
export function InfoTip({
  content,
  size = 15,
}: {
  content: string;
  size?: number;
}) {
  return (
    <Tooltip content={content}>
      <span className={styles.info}>
        <IconInfoHexagonFilled size={size} aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
