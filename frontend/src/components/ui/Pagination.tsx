import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/** Figma pagination: range on the left, numbered pages (IBM Plex Mono) with prev / next on the right. Hidden for one page. */
export function Pagination({ page, pageCount, total, pageSize, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <span className={styles.range}>
        {from}–{to} of {total}
      </span>
      <div className={styles.pages}>
        <button type="button" className={styles.page} onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Previous page">
          <IconChevronLeft size={14} stroke={1.5} aria-hidden="true" />
        </button>
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            type="button"
            className={styles.page}
            data-active={i === page}
            aria-current={i === page ? 'page' : undefined}
            onClick={() => onChange(i)}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" className={styles.page} onClick={() => onChange(page + 1)} disabled={page === pageCount - 1} aria-label="Next page">
          <IconChevronRight size={14} stroke={1.5} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
