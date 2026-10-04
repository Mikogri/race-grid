import type { RoundStatus } from '../analytics/season';
import { Badge, type BadgeTone } from './ui/Badge';

const TONE: Record<RoundStatus, BadgeTone> = {
  completed: 'success',
  'in-progress': 'accent',
  upcoming: 'info',
  cancelled: 'danger',
};

const LABEL: Record<RoundStatus, string> = {
  completed: 'Completed',
  'in-progress': 'Live weekend',
  upcoming: 'Upcoming',
  cancelled: 'Cancelled',
};

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
