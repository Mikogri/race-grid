import { useState } from "react";

/** Lists longer than this are paginated. */
export const PAGE_SIZE = 30;

/** Client-side paging of a list; resets to the first page when the list shrinks below the current page. */
export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  return {
    page: current,
    pageCount,
    setPage,
    items: items.slice(current * pageSize, (current + 1) * pageSize),
    total: items.length,
    pageSize,
  };
}
