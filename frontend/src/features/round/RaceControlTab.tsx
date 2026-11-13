import { labelFor, type DriverLookup } from "../../analytics/drivers";
import type { RaceControlMessage, Session } from "../../api/openf1/types";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Pagination } from "../../components/ui/Pagination";
import { usePagination } from "../../components/ui/usePagination";
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from "../../components/ui/StateViews";
import table from "../../components/ui/Table.module.css";
import { useSessionData } from "../../data/sessionData";
import { formatUtcTime } from "../../lib/format";

function flagTone(message: RaceControlMessage): BadgeTone {
  const flag = message.flag ?? "";
  if (flag === "RED") return "danger";
  if (message.category === "SafetyCar") return "warning";
  if (flag.includes("YELLOW")) return "warning";
  if (flag === "GREEN" || flag === "CLEAR") return "success";
  if (flag === "BLUE") return "info";
  return "neutral";
}

export function RaceControlTab({
  session,
  lookup,
}: {
  session: Session;
  lookup: DriverLookup;
}) {
  const control = useSessionData("race_control", session);
  if (control.error)
    return (
      <ErrorState
        error={control.error}
        onRetry={() => void control.refetch()}
      />
    );
  if (control.isPending) return <Skeleton rows={12} />;
  if (!control.data?.length)
    return <EmptyState title="No race control messages for this session" />;

  return <RaceControlTable messages={control.data} lookup={lookup} />;
}

function RaceControlTable({
  messages,
  lookup,
}: {
  messages: RaceControlMessage[];
  lookup: DriverLookup;
}) {
  const pages = usePagination(messages);
  return (
    <Card title={`Race control · ${messages.length} messages`} flush>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead>
            <tr>
              <th className={table.optionalNarrow}>Time</th>
              <th className={table.right}>Lap</th>
              <th>Category</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {pages.items.map((m, i) => (
              <tr key={`${m.date}-${i}`}>
                <td className={`${table.muted} ${table.optionalNarrow}`}>
                  {formatUtcTime(m.date)}
                </td>
                <td className={table.right}>{m.lap_number ?? "—"}</td>
                <td>
                  <Badge tone={flagTone(m)}>{m.flag ?? m.category}</Badge>
                </td>
                <td className={table.wrapText}>
                  {m.message}
                  {m.driver_number ? (
                    <span className={table.muted}>
                      {" "}
                      · {labelFor(lookup, m.driver_number).acronym}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={pages.page}
        pageCount={pages.pageCount}
        total={pages.total}
        pageSize={pages.pageSize}
        onChange={pages.setPage}
      />
    </Card>
  );
}
