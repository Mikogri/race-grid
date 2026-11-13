import { useEffect, useState } from "react";

export type ReplaySpeed = 1 | 2 | 5 | 10;

export interface ClockState {
  /** Epoch ms of the replayed moment. */
  time: number;
  playing: boolean;
  speed: ReplaySpeed;
}

type Listener = (state: ClockState, reason: "tick" | "change") => void;

/**
 * Replay clock outside React: the map reads it every frame, panels subscribe at a lower rate.
 * Keeps one requestAnimationFrame loop only while playing.
 */
export class ReplayClock {
  readonly start: number;
  readonly end: number;
  private state: ClockState;
  private listeners = new Set<Listener>();
  private raf = 0;
  private lastFrame = 0;

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
    this.state = { time: start, playing: false, speed: 1 };
  }

  get snapshot(): ClockState {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(reason: "tick" | "change") {
    this.listeners.forEach((listener) => listener(this.state, reason));
  }

  private loop = (now: number) => {
    const elapsed = Math.min(1000, now - this.lastFrame);
    this.lastFrame = now;
    const time = Math.min(
      this.end,
      this.state.time + elapsed * this.state.speed,
    );
    const finished = time >= this.end;
    this.state = { ...this.state, time, playing: !finished };
    this.emit(finished ? "change" : "tick");
    if (!finished) this.raf = requestAnimationFrame(this.loop);
  };

  play() {
    if (this.state.playing) return;
    if (this.state.time >= this.end)
      this.state = { ...this.state, time: this.start };
    this.state = { ...this.state, playing: true };
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.emit("change");
  }

  pause() {
    if (!this.state.playing) return;
    cancelAnimationFrame(this.raf);
    this.state = { ...this.state, playing: false };
    this.emit("change");
  }

  toggle() {
    if (this.state.playing) this.pause();
    else this.play();
  }

  seek(time: number) {
    this.state = {
      ...this.state,
      time: Math.min(this.end, Math.max(this.start, time)),
    };
    this.emit("change");
  }

  setSpeed(speed: ReplaySpeed) {
    this.state = { ...this.state, speed };
    this.emit("change");
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.listeners.clear();
  }
}

/**
 * Clock state sampled at most `fps` times per second (always immediately on play/pause/seek).
 * A clock instance lives as long as its replay view, so the initial snapshot never goes stale.
 */
export function useClock(clock: ReplayClock, fps: number): ClockState {
  const [state, setState] = useState(clock.snapshot);
  useEffect(() => {
    let last = 0;
    return clock.subscribe((next, reason) => {
      const now = performance.now();
      if (reason === "change" || now - last >= 1000 / fps) {
        last = now;
        setState(next);
      }
    });
  }, [clock, fps]);
  return state;
}
