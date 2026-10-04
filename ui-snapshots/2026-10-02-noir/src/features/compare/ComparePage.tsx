import { Navigate, useLocation, useSearchParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { DriverCompare } from './DriverCompare';
import { LapCompare } from './LapCompare';

/** Compare (menu: Analysis → Compare): two driver seasons side by side. */
export function ComparePage() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  // Links from before the split into two pages: /compare?mode=lap was the lap view.
  if (params.get('mode') === 'lap') return <Navigate to={`/compare/laps${search}`} replace />;
  return (
    <>
      <PageHeader title="Compare" description="Two driver seasons side by side: results, qualifying gaps and race pace." />
      <DriverCompare />
    </>
  );
}

/** Lap Comparison (menu: Analysis → Lap Comparison): telemetry of individual laps overlaid. */
export function LapComparisonPage() {
  return (
    <>
      <PageHeader title="Lap Comparison" description="Overlay the telemetry of any laps: speed, throttle, brake and the time delta." />
      <LapCompare />
    </>
  );
}
