import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Position of a highlight that slides under the active item of a tab/segment group.
 * The first measurement is applied without transition so the pill does not fly in from 0.
 */
export function useSlidingIndicator<T extends HTMLElement>(
  activeKey: string | number,
) {
  const containerRef = useRef<T>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const measured = useRef(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const active = container.querySelector<HTMLElement>(
        '[data-active="true"]',
      );
      if (!active) {
        setStyle({ opacity: 0 });
        return;
      }
      setStyle({
        width: active.offsetWidth,
        height: active.offsetHeight,
        // x and y: groups may wrap onto several lines instead of scrolling horizontally
        transform: `translate(${active.offsetLeft}px, ${active.offsetTop}px)`,
        opacity: 1,
        transition: measured.current ? undefined : "none",
      });
      measured.current = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey]);

  return { containerRef, indicatorStyle: style };
}
