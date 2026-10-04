import { acquireSlot, pauseFor } from './rateLimiter';

const BASE_URL = 'https://api.openf1.org/v1';
const CACHE_NAME = 'racegrid-openf1-v1';
const STORED_AT_HEADER = 'x-racegrid-stored-at';
const MAX_ATTEMPTS = 4;
/** OpenF1 can take 20+ s under load; past this a request counts as failed instead of loading forever. */
const REQUEST_TIMEOUT_MS = 45_000;
/** OpenF1 answers 401 to unauthenticated requests while a session is live (live data is for paid accounts). */
export const LIVE_LOCKED = 401;
export const TIMED_OUT = 408;

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
/** Data of sessions that have finished does not change; keep it forever. */
export const IMMUTABLE = Number.POSITIVE_INFINITY;

export class OpenF1Error extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = 'OpenF1Error';
    this.status = status;
    this.url = url;
  }
}

type ParamValue = string | number | boolean;
/**
 * Keys may carry an OpenF1 comparison operator suffix, e.g. `{ 'date>=': iso, session_key: 9158 }`.
 * Undefined values are skipped.
 */
export type OpenF1Params = Record<string, ParamValue | undefined>;

export interface RequestOptions {
  signal?: AbortSignal;
  /** How long a stored response stays valid in the browser Cache Storage. 0 disables persistence. */
  ttlMs: number;
}

export function buildUrl(endpoint: string, params: OpenF1Params): string {
  const query = Object.entries(params)
    .filter((entry): entry is [string, ParamValue] => entry[1] !== undefined)
    .map(([key, value]) => {
      const match = /^(.*?)(>=|<=|>|<)?$/.exec(key);
      const field = match?.[1] ?? key;
      const operator = match?.[2] ?? '=';
      return `${encodeURIComponent(field)}${operator}${encodeURIComponent(String(value))}`;
    })
    .join('&');
  return `${BASE_URL}/${endpoint}${query ? `?${query}` : ''}`;
}

let cacheUnavailableLogged = false;

async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch (error) {
    if (!cacheUnavailableLogged) {
      console.warn('RaceGrid: Cache Storage unavailable, OpenF1 responses will not persist.', error);
      cacheUnavailableLogged = true;
    }
    return null;
  }
}

async function readStored<T>(cache: Cache, url: string, ttlMs: number): Promise<T[] | null> {
  const stored = await cache.match(url);
  if (!stored) return null;
  const storedAt = Number(stored.headers.get(STORED_AT_HEADER));
  if (!Number.isFinite(storedAt) || Date.now() - storedAt > ttlMs) return null;
  return (await stored.json()) as T[];
}

async function store(cache: Cache, url: string, body: string) {
  try {
    await cache.put(
      url,
      new Response(body, {
        headers: { 'content-type': 'application/json', [STORED_AT_HEADER]: String(Date.now()) },
      }),
    );
  } catch (error) {
    // Quota errors must not break the request that already succeeded.
    console.warn('RaceGrid: could not persist OpenF1 response', url, error);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET an OpenF1 endpoint. "No results found" (HTTP 404) is returned as an empty array. */
export async function openf1<T>(endpoint: string, params: OpenF1Params, options: RequestOptions): Promise<T[]> {
  const url = buildUrl(endpoint, params);
  const cache = options.ttlMs > 0 ? await openCache() : null;
  if (cache) {
    const stored = await readStored<T>(cache, url, options.ttlMs);
    if (stored) return stored;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await acquireSlot(options.signal);
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, { signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout });
    } catch (error) {
      if (timeout.aborted && !options.signal?.aborted) throw new OpenF1Error(`OpenF1 ${endpoint} did not respond in time`, TIMED_OUT, url);
      throw error;
    }

    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get('retry-after'));
      pauseFor((Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 10) * 1000);
      continue;
    }
    if (response.status === 404) return [];
    if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
      await sleep(1000 * attempt);
      continue;
    }
    if (!response.ok) {
      const detail = await response.text();
      throw new OpenF1Error(`OpenF1 ${endpoint} failed (${response.status}): ${detail.slice(0, 200)}`, response.status, url);
    }

    const body = await response.text();
    const data = JSON.parse(body) as T[];
    if (cache) void store(cache, url, body);
    return data;
  }
  throw new OpenF1Error(`OpenF1 ${endpoint} is rate limited, try again in a minute.`, 429, url);
}
