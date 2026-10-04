import type { CircuitYear } from '../../data/circuits';
import { Card } from '../../components/ui/Card';
import { DetailList } from '../../components/ui/DetailList';
import { formatDate, formatLapTime } from '../../lib/format';

/** Provenance of the outline: which OpenF1 lap it was reconstructed from. */
export function ReferenceLapCard({ circuitYear }: { circuitYear: CircuitYear }) {
  const { reference, quality } = circuitYear;
  return (
    <Card title={`Reference lap · ${circuitYear.year}`}>
      <DetailList
        items={[
          { label: 'Session', value: `${reference.sessionName}, ${formatDate(reference.lapDateStart)}` },
          { label: 'Driver / lap', value: `#${reference.driverNumber} · lap ${reference.lapNumber}` },
          { label: 'Lap time', value: formatLapTime(reference.lapDuration) },
          { label: 'Sectors', value: reference.sectorSeconds.map((s) => formatLapTime(s)).join(' · ') },
          { label: 'Speed trap', value: reference.speedTrap.st ? `${reference.speedTrap.st} km/h` : '—' },
          { label: 'Samples', value: `${quality.pointCount} points${quality.checksPassed ? '' : ' (checks failed)'}` },
        ]}
      />
    </Card>
  );
}
