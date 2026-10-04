// OpenF1's unauthenticated REST limits (observed): 3 requests/second and ~30 requests/minute,
// with `retry-after` on HTTP 429. Every request goes through this FIFO queue so the app
// degrades into "waiting" instead of failing when a page needs many requests.

const MIN_SPACING_MS = 360;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 28;

export interface RateLimitStatus {
  queued: number;
  /** Epoch ms until which the queue is paused after a 429, or null. */
  pausedUntil: number | null;
}

type Listener = () => void;

interface Waiter {
  resolve: () => void;
  reject: (reason: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

const queue: Waiter[] = [];
const sentAt: number[] = [];
const listeners = new Set<Listener>();
let pausedUntil: number | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let status: RateLimitStatus = { queued: 0, pausedUntil: null };

function publish() {
  status = { queued: queue.length, pausedUntil };
  listeners.forEach((listener) => listener());
}

function nextSlotDelay(now: number): number {
  while (sentAt.length && now - sentAt[0] >= WINDOW_MS) sentAt.shift();
  let delay = 0;
  if (pausedUntil !== null) delay = Math.max(delay, pausedUntil - now);
  const last = sentAt[sentAt.length - 1];
  if (last !== undefined) delay = Math.max(delay, last + MIN_SPACING_MS - now);
  if (sentAt.length >= MAX_PER_WINDOW) delay = Math.max(delay, sentAt[0] + WINDOW_MS - now);
  return delay;
}

function pump() {
  if (timer !== null) return;
  const now = Date.now();
  if (pausedUntil !== null && pausedUntil <= now) pausedUntil = null;
  const waiter = queue[0];
  if (!waiter) {
    publish();
    return;
  }
  const delay = nextSlotDelay(now);
  if (delay > 0) {
    timer = setTimeout(() => {
      timer = null;
      pump();
    }, delay);
    publish();
    return;
  }
  queue.shift();
  sentAt.push(now);
  if (waiter.onAbort) waiter.signal?.removeEventListener('abort', waiter.onAbort);
  waiter.resolve();
  publish();
  pump();
}

/** Resolves when the caller may send one request. Rejects if `signal` aborts while queued. */
export function acquireSlot(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const waiter: Waiter = { resolve, reject, signal };
    if (signal) {
      waiter.onAbort = () => {
        const index = queue.indexOf(waiter);
        if (index >= 0) queue.splice(index, 1);
        publish();
        reject(signal.reason);
      };
      signal.addEventListener('abort', waiter.onAbort, { once: true });
    }
    queue.push(waiter);
    pump();
  });
}

/** Called after an HTTP 429 so that all queued requests wait for the server's retry-after. */
export function pauseFor(ms: number) {
  pausedUntil = Math.max(pausedUntil ?? 0, Date.now() + ms);
  publish();
}

export function subscribeRateLimit(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRateLimitStatus(): RateLimitStatus {
  return status;
}
