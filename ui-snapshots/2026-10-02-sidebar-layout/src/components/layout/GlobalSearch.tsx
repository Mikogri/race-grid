import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { IconCommand, IconSearch } from '@tabler/icons-react';
import { useSelectedSeason } from '../../app/seasons';
import { useCircuitIndex } from '../../data/circuits';
import { useSeason } from '../../data/season';
import styles from './GlobalSearch.module.css';

interface SearchResult {
  id: string;
  label: string;
  kind: string;
  to: string;
}

const MAX_RESULTS = 8;

export function GlobalSearch() {
  const { year } = useSelectedSeason();
  const { season } = useSeason(year);
  const circuits = useCircuitIndex();
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K from anywhere; "/" too when no field has focus.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const commandK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      const slash = event.key === '/' && !target?.closest('input, textarea, select, [contenteditable]');
      if (!commandK && !slash) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const needle = query.trim().toLowerCase();
  const candidates: SearchResult[] = [
    ...[...(season?.drivers.values() ?? [])].map((d) => ({
      id: `d${d.driverNumber}`,
      label: `${d.fullName} · ${d.acronym} #${d.driverNumber}`,
      kind: 'Driver',
      to: `/drivers/${year}/${d.driverNumber}`,
    })),
    ...[...(season?.teams.values() ?? [])].map((t) => ({ id: `t${t.slug}`, label: t.name, kind: 'Constructor', to: `/constructors/${year}/${t.slug}` })),
    ...(season?.rounds ?? [])
      .filter((r) => r.round !== null)
      .map((r) => ({ id: `r${r.meeting.meeting_key}`, label: r.meeting.meeting_name, kind: `Round ${r.round}`, to: `/rounds/${r.meeting.meeting_key}` })),
    ...(circuits.data ?? []).map((c) => ({
      id: `c${c.slug}`,
      label: `${c.name}${c.meeting ? ` · ${c.meeting.countryName}` : ''}`,
      kind: 'Track',
      to: `/tracks/${c.slug}`,
    })),
  ];
  const results = needle ? candidates.filter((c) => c.label.toLowerCase().includes(needle)).slice(0, MAX_RESULTS) : [];

  const go = (result: SearchResult | undefined) => {
    if (!result) return;
    navigate(result.to);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      go(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const expanded = open && results.length > 0;
  return (
    <div className={styles.search}>
      <IconSearch size={15} stroke={1.5} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
        aria-label="Search drivers, constructors, rounds and tracks"
        ref={inputRef}
        placeholder="Search teams, drivers, tracks..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={styles.input}
      />
      {!query && (
        <kbd className={styles.kbd} aria-hidden="true">
          <IconCommand size={16} stroke={1.5} />K
        </kbd>
      )}
      {expanded && (
        <ul id={listId} role="listbox" className={styles.results}>
          {results.map((result, index) => (
            <li
              key={result.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? `${styles.result} ${styles.activeResult}` : styles.result}
              // mousedown fires before the input blur closes the list
              onMouseDown={(event) => {
                event.preventDefault();
                go(result);
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span>{result.label}</span>
              <span className={styles.kind}>{result.kind}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
