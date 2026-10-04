import type { FinishStatus } from '../analytics/season';
import { Badge } from './ui/Badge';

/** Finishing position, or a DNF/DNS/DSQ/NC badge. */
export function FinishCell({ position, status }: { position: number | null; status: FinishStatus }) {
  if (status === 'finished' && position !== null) return <>{position}</>;
  const label = status === 'finished' ? 'NC' : status.toUpperCase();
  return <Badge tone={status === 'dsq' ? 'danger' : 'neutral'}>{position !== null && status !== 'finished' ? `${label} · ${position}` : label}</Badge>;
}
