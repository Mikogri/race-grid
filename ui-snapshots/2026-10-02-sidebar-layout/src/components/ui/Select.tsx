import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import styles from './Select.module.css';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  label: string;
  /** Show the label above the control (otherwise it is screen-reader only). */
  showLabel?: boolean;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Leading icon inside the trigger (e.g. a calendar for the season). */
  icon?: ReactNode;
}

/**
 * Custom listbox. The menu fades in under the trigger (flipping to its right edge near the viewport edge),
 * uses a CSS transition so rapid open/close is interruptible, and supports the ARIA combobox keys.
 */
export function Select<T extends string | number>({
  label,
  showLabel = false,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className,
  icon,
}: SelectProps<T>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [alignRight, setAlignRight] = useState(false);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  // Close on outside pointer down.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keep the highlighted option visible while navigating with the keyboard.
  // Only the list scrolls; scrollIntoView would also scroll the page.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !list || !item) return;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }, [open, active]);

  const openList = () => {
    if (disabled || options.length === 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    // The list can be up to 320 px wide; flip to the trigger's right edge if it would leave the viewport.
    setAlignRight(Boolean(rect && rect.left + 320 > window.innerWidth - 16));
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    const last = options.length - 1;
    const moves: Record<string, number> = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key] ?? 0);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={[styles.field, className].filter(Boolean).join(' ')}>
      <span id={`${id}-label`} className={showLabel ? styles.label : 'visually-hidden'}>
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        disabled={disabled}
        className={styles.trigger}
        data-open={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={styles.start}>
          {icon}
          <span className={selected ? styles.value : styles.placeholder}>{selected?.label ?? placeholder}</span>
        </span>
        <IconChevronDown size={16} stroke={1.5} className={styles.chevron} aria-hidden="true" />
      </button>
      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-labelledby={`${id}-label`}
        className={`${styles.list} ${alignRight ? styles.alignRight : ''}`}
        data-open={open}
      >
        {options.map((option, index) => (
          <li
            key={String(option.value)}
            id={`${id}-opt-${index}`}
            data-index={index}
            role="option"
            aria-selected={index === selectedIndex}
            className={`${styles.option} ${index === active ? styles.active : ''}`}
            onPointerEnter={() => setActive(index)}
            // pointerdown on the document would close the list before click fires
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => choose(index)}
          >
            <span className={styles.optionLabel}>{option.label}</span>
            {index === selectedIndex && <IconCheck size={14} stroke={1.5} className={styles.check} aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
