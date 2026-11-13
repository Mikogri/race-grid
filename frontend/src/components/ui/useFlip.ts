import { useLayoutEffect, useRef } from "react";

const REDUCED =
  typeof matchMedia !== "undefined"
    ? matchMedia("(prefers-reduced-motion: reduce)")
    : null;

/**
 * FLIP re-ordering: children marked with `data-flip-key` glide from their previous position to the new
 * one when the order changes (e.g. an overtake in the timing tower). Uses WAAPI transforms only, so it
 * stays on the compositor and is interruptible by the next re-order.
 */
export function useFlip<T extends HTMLElement>(orderKey: string) {
  const containerRef = useRef<T>(null);
  const previous = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>("[data-flip-key]");
    const next = new Map<string, number>();
    items.forEach((item) => {
      const key = item.dataset.flipKey ?? "";
      const top = item.offsetTop; // layout position, independent of page scroll
      next.set(key, top);
      const before = previous.current.get(key);
      if (before === undefined || before === top || REDUCED?.matches) return;
      item.animate(
        [
          { transform: `translateY(${before - top}px)` },
          { transform: "translateY(0)" },
        ],
        {
          duration: 280,
          easing: "cubic-bezier(0.77, 0, 0.175, 1)",
        },
      );
    });
    previous.current = next;
  }, [orderKey]);

  return containerRef;
}
