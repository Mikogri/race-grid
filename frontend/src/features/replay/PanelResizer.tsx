import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import styles from "./ReplayPage.module.css";

const MIN_HEIGHT = 160;
/** The map keeps at least this much of the workspace. */
const MAP_MIN_HEIGHT = 260;
const KEY_STEP = 24;

interface PanelResizerProps {
  panel: RefObject<HTMLElement | null>;
  workspace: RefObject<HTMLElement | null>;
  onResize: (height: number) => void;
  onCommit: (height: number) => void;
  onDragChange: (dragging: boolean) => void;
}

/** Drag handle above the analysis panel: drag or use ↑/↓ to change its height within limits. */
export function PanelResizer({
  panel,
  workspace,
  onResize,
  onCommit,
  onDragChange,
}: PanelResizerProps) {
  const drag = useRef<{ y: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (value: number) => {
    const max = (workspace.current?.clientHeight ?? 0) - MAP_MIN_HEIGHT;
    return Math.round(
      Math.min(Math.max(value, MIN_HEIGHT), Math.max(MIN_HEIGHT, max)),
    );
  };
  const current = () =>
    panel.current?.getBoundingClientRect().height ?? MIN_HEIGHT;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, height: current() };
    setDragging(true);
    onDragChange(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onResize(clamp(drag.current.height + drag.current.y - event.clientY));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    onDragChange(false);
    onCommit(current());
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const next = clamp(
      current() + (event.key === "ArrowUp" ? KEY_STEP : -KEY_STEP),
    );
    onResize(next);
    onCommit(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize analysis panel"
      tabIndex={0}
      className={styles.resizer}
      data-dragging={dragging}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}
