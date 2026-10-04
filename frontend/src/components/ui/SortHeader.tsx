import { IconArrowsMoveVertical, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { SortDirection, SortState } from './sort';
import table from './Table.module.css';

interface SortHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K, natural: SortDirection) => void;
  /** Direction on first click: 'asc' for positions and names, 'desc' for counts and points. */
  natural?: SortDirection;
  className?: string;
}

/** Sortable column header (Figma: label + move-vertical icon). */
export function SortHeader<K extends string>({ label, sortKey, sort, onSort, natural = 'asc', className }: SortHeaderProps<K>) {
  const active = sort.key === sortKey;
  const Icon = !active ? IconArrowsMoveVertical : sort.direction === 'asc' ? IconChevronUp : IconChevronDown;
  return (
    <th className={className} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={table.sort} onClick={() => onSort(sortKey, natural)}>
        {label}
        <Icon size={12} stroke={1.5} aria-hidden="true" />
      </button>
    </th>
  );
}
