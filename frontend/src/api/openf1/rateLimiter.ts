// OpenF1's unauthenticated REST limits (observed): 3 requests/second and ~30 requests/minute,
// with `retry-after` on HTTP 429. Every request goes through this FIFO queue so the app
// degrades into "waiting" instead of failing when a page needs many requests.

const MIN_SPACING_MS = 360;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 28;

interface Waiter {
  resolve: () => void;
  reject: (reason: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

const queue: Waiter[] = [];
const sentAt: number[] = [];
let pausedUntil: number | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

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
  if (!waiter) return;
  const delay = nextSlotDelay(now);
  if (delay > 0) {
    timer = setTimeout(() => {
      timer = null;
      pump();
    }, delay);
    return;
  }
  queue.shift();
  sentAt.push(now);
  if (waiter.onAbort) waiter.signal?.removeEventListener('abort', waiter.onAbort);
  waiter.resolve();
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
}
