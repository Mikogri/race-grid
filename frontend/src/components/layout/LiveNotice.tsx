import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconBroadcast } from "@tabler/icons-react";
import { LIVE_LOCKED, OpenF1Error } from "../../api/openf1/client";
import styles from "./LiveNotice.module.css";

/**
 * Notice over the page while OpenF1 locks the API during a live session (any request answered 401).
 * It goes away by itself once a retried request succeeds.
 */
export function LiveNotice() {
  const cache = useQueryClient().getQueryCache();
  const locked = useSyncExternalStore(
    (onChange) => cache.subscribe(onChange),
    () =>
      cache
        .getAll()
        .some(
          (query) =>
            query.state.error instanceof OpenF1Error &&
            query.state.error.status === LIVE_LOCKED,
        ),
  );
  if (!locked) return null;
  return (
    <p className={styles.notice} role="status">
      <IconBroadcast size={16} stroke={1.5} aria-hidden="true" />
      <span>
        <strong>Live session in progress.</strong> OpenF1 serves data only to
        paid accounts during live sessions; data already loaded stays available
        and the rest returns after the session.
      </span>
    </p>
  );
}
