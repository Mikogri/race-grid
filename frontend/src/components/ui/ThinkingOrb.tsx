// React port of the thinking-orbs Vue component (MIT, Copyright (c) 2026 Jakub Antalik).
// The canvas engine lives unchanged in src/vendor/thinking-orbs. Reserved for heavy work only
// (replay preparation, compare/performance analysis) — regular requests use skeletons.
import { useEffect, useRef, useState } from 'react';
import { MODE_DRAWS } from '../../vendor/thinking-orbs/engine/registry';
import { resolvePreset } from '../../vendor/thinking-orbs/presets';
import type { OrbSize, OrbState } from '../../vendor/thinking-orbs/types';

const LABELS: Record<OrbState, string> = {
  working: 'Working…',
  searching: 'Searching…',
  solving: 'Solving…',
  listening: 'Listening…',
  composing: 'Composing…',
  shaping: 'Shaping…',
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface ThinkingOrbProps {
  state?: OrbState;
  size?: OrbSize;
  speed?: number;
  paused?: boolean;
  label?: string;
  className?: string;
}

export function ThinkingOrb({ state = 'working', size = 64, speed = 1, paused = false, label, className }: ThinkingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { mode, speed: baseSpeed, opts } = resolvePreset(state, size);
    const draw = MODE_DRAWS[mode];
    const effectiveSpeed = baseSpeed * speed;
    const frame = (seconds: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      draw(ctx, size, seconds, true, opts);
    };

    if (reduced) {
      frame(0.6);
      return;
    }

    let raf = 0;
    let running = false;
    let visible = true;
    const loop = () => {
      frame((performance.now() / 1000) * effectiveSpeed);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || paused) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    frame((performance.now() / 1000) * effectiveSpeed);

    // Pause while scrolled out of view or while the tab is hidden.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && document.visibilityState !== 'hidden') start();
      else stop();
    });
    observer.observe(canvas);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stop();
      else if (visible) start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [state, size, speed, paused, reduced]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={label ?? LABELS[state]}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}
