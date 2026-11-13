import { queryOptions, useQuery } from "@tanstack/react-query";
import type { OpenF1Params } from "../api/openf1/client";
import {
  fetchOpenF1,
  ttlForSessionEnd,
  type Endpoint,
} from "../api/openf1/endpoints";
import type { Session } from "../api/openf1/types";

type SessionRef = Pick<Session, "session_key" | "date_end">;

/**
 * Shared query definition for session-scoped endpoints, so every screen that needs e.g. the laps of
 * a session hits the same cache entry (deduplicated in memory and persisted by the client).
 */
export function sessionQuery<E extends Endpoint>(
  endpoint: E,
  session: SessionRef,
  extra: OpenF1Params = {},
) {
  return queryOptions({
    queryKey: [
      "openf1",
      endpoint,
      { sessionKey: session.session_key, ...extra },
    ],
    queryFn: ({ signal }) =>
      fetchOpenF1(
        endpoint,
        { session_key: session.session_key, ...extra },
        { signal, ttlMs: ttlForSessionEnd(session.date_end) },
      ),
    staleTime: 5 * 60_000,
  });
}

export function useSessionData<E extends Endpoint>(
  endpoint: E,
  session: SessionRef | null | undefined,
  extra: OpenF1Params = {},
) {
  const placeholder: SessionRef = { session_key: -1, date_end: "" };
  return useQuery({
    ...sessionQuery(endpoint, session ?? placeholder, extra),
    enabled: Boolean(session),
  });
}
