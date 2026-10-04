/** 84.892 -> "1:24.892" */
export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  const secondsText = rest.toFixed(3).padStart(6, '0');
  return minutes > 0 ? `${minutes}:${secondsText}` : rest.toFixed(3);
}

/** Signed gap in seconds: "+0.196", "−1.203". */
export function formatDelta(seconds: number | null | undefined, digits = 3): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const sign = seconds > 0 ? '+' : seconds < 0 ? '−' : '±';
  return `${sign}${Math.abs(seconds).toFixed(digits)}`;
}

/** OpenF1 gaps can be seconds or strings like "+1 LAP". */
export function formatGap(gap: number | string | null | undefined): string {
  if (gap == null) return '—';
  if (typeof gap === 'string') return gap;
  if (gap === 0) return 'Leader';
  return `+${gap.toFixed(3)}`;
}

/** 5882.143 -> "1:38:02.143" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = (seconds % 60).toFixed(3).padStart(6, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

/** Clock for replay: seconds since start -> "1:02:05" */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fullFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });

/** "4 – 6 Jul 2025" (UTC dates; OpenF1 publishes UTC timestamps). */
export function formatDateRange(start: string, end: string): string {
  const a = new Date(start);
  const b = new Date(end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  if (sameMonth) return `${a.getUTCDate()} – ${fullFormat.format(b)}`;
  return `${dayFormat.format(a)} – ${fullFormat.format(b)}`;
}

export function formatDate(iso: string): string {
  return fullFormat.format(new Date(iso));
}

export function formatUtcTime(iso: string): string {
  return `${timeFormat.format(new Date(iso))} UTC`;
}

export function formatPoints(points: number | null | undefined): string {
  if (points == null) return '—';
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function ordinal(position: number | null | undefined): string {
  if (position == null) return '—';
  return `P${position}`;
}

/** "undercut" → "Undercut": sentence case for data labels shown in badges. */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Relative start of an upcoming event: "Today", "Tomorrow", "In 12 days". */
export function formatCountdown(iso: string, now = Date.now()): string {
  const days = Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
  if (days <= 0) return 'Today';
  return days === 1 ? 'Tomorrow' : `In ${days} days`;
}
