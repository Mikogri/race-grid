import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  IconLayoutBottombarCollapse,
  IconLayoutBottombarExpand,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconActivity,
  IconCloud,
  IconFlag,
  IconMicrophone,
  IconRoute,
  IconStopwatch,
  type Icon,
} from '@tabler/icons-react';
import { driverLapAt, raceLapAt, sectorsAt, timingAt, type ReplayModel } from '../../analytics/replay/model';
import { buildTrackPath } from '../../analytics/replay/trackPath';
import { Button } from '../../components/ui/Button';
import { Card, Panel } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/StateViews';
import { Tabs } from '../../components/ui/Tabs';
import type { CircuitYear } from '../../data/circuits';
import { toMs } from '../../lib/stats';
import { ReplayClock, useClock } from './clock';
import { EventsPanel } from './EventsPanel';
import { RadioPanel } from './RadioPanel';
import { PanelResizer } from './PanelResizer';
import { useAnalysisHeight } from './useAnalysisHeight';
import { ReplayControls } from './ReplayControls';
import { SelectedDriverPanel } from './SelectedDriverPanel';
import { StrategyPanel } from './StrategyPanel';
import { TelemetryPanel } from './TelemetryPanel';
import { TimingTower } from './TimingTower';
import { TrackMap } from './TrackMap';
import { useLocationChunks, useReconstructedTrack, useTelemetryChunks } from './useReplayData';
import { WeatherPanel } from './WeatherPanel';
import styles from './ReplayPage.module.css';

type PanelTab = 'telemetry' | 'strategy' | 'events' | 'radio' | 'weather';
type PanelId = 'tower' | 'driver' | 'analysis';

function useReplayKeyboard(clock: ReplayClock) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'AUDIO'].includes(target.tagName)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        clock.toggle();
      } else if (event.key === 'ArrowRight') {
        clock.seek(clock.snapshot.time + 10_000);
      } else if (event.key === 'ArrowLeft') {
        clock.seek(clock.snapshot.time - 10_000);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clock]);
}

export function ReplayView({ model, geometry }: { model: ReplayModel; geometry: CircuitYear | null }) {
  const [clock] = useState(() => new ReplayClock(model.startMs, model.endMs));
  useEffect(() => () => clock.dispose(), [clock]);
  useReplayKeyboard(clock);

  const winner = [...model.results.values()].find((r) => r.position === 1)?.driver_number;
  const [selected, setSelected] = useState<number>(winner ?? model.drivers[0]?.driverNumber ?? 0);
  const [tab, setTab] = useState<PanelTab>('telemetry');
  const workspaceRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const analysis = useAnalysisHeight();
  const [resizing, setResizing] = useState(false);
  // Every panel except the map can be minimised; the grid animates the freed space to the map.
  const [collapsed, setCollapsed] = useState<Record<PanelId, boolean>>({ tower: false, driver: false, analysis: false });
  const toggle = (id: PanelId) => setCollapsed((current) => ({ ...current, [id]: !current[id] }));
  const { time } = useClock(clock, 2);

  const path = useMemo(() => (geometry ? buildTrackPath(geometry.points) : null), [geometry]);
  const reconstructed = useReconstructedTrack(model, !geometry);
  const transform = geometry?.transform ?? reconstructed?.transform ?? null;
  const chunks = useLocationChunks(model, time, transform, path);

  const retired = new Set(timingAt(model, time).filter((r) => r.retired).map((r) => r.driver.driverNumber));
  const lap = driverLapAt(model, selected, time);
  const lapStartMs = lap?.date_start ? toMs(lap.date_start) : time;
  const telemetry = useTelemetryChunks(model, selected, lapStartMs, time);

  const tabs = [
    { id: 'telemetry' as const, label: 'Telemetry', icon: <IconActivity size={16} stroke={1.5} aria-hidden="true" /> },
    { id: 'strategy' as const, label: 'Strategy', icon: <IconRoute size={16} stroke={1.5} aria-hidden="true" /> },
    { id: 'events' as const, label: 'Events', icon: <IconFlag size={16} stroke={1.5} aria-hidden="true" /> },
    {
      id: 'radio' as const,
      label: `Team radio${model.raw.radio.length ? ` · ${model.raw.radio.length}` : ''}`,
      icon: <IconMicrophone size={16} stroke={1.5} aria-hidden="true" />,
    },
    { id: 'weather' as const, label: 'Weather', icon: <IconCloud size={16} stroke={1.5} aria-hidden="true" /> },
  ];

  return (
    <div
      ref={workspaceRef}
      className={styles.workspace}
      data-tower-collapsed={collapsed.tower}
      data-driver-collapsed={collapsed.driver}
      data-analysis-collapsed={collapsed.analysis}
      data-resizing={resizing}
      style={analysis.height ? ({ '--analysis-height': `${analysis.height}px` } as CSSProperties) : undefined}
    >
      <div className={`${styles.slot} ${styles.towerSlot}`} data-collapsed={collapsed.tower}>
      <Card
        title={
          <span className={styles.titleWithIcon}>
            <IconStopwatch size={18} stroke={1.5} aria-hidden="true" />
            Timing
          </span>
        }
        actions={
          <>
            <TowerLap clock={clock} model={model} />
            <CollapseButton label="timing" collapsed={false} icon={IconLayoutSidebarLeftCollapse} onClick={() => toggle('tower')} />
          </>
        }
        flush
        className={styles.towerTile}
      >
        <TimingTower clock={clock} model={model} selectedDriver={selected} onSelectDriver={setSelected} />
      </Card>
        {collapsed.tower && <CollapsedRail label="Timing" icon={IconLayoutSidebarLeftExpand} onExpand={() => toggle('tower')} />}
      </div>
      <section className={styles.mapTile} aria-label="Track map">
        {chunks.error ? (
          <ErrorState error={chunks.error} title="Car positions could not be loaded" />
        ) : (
          <TrackMap
            clock={clock}
            outline={geometry?.outline ?? reconstructed?.outline ?? null}
            sectors={geometry?.sectors}
            startGate={geometry?.gates.find((g) => g.type === 'START') ?? null}
            path={path}
            samples={chunks.samples}
            drivers={model.drivers}
            retired={retired}
            selectedDriver={selected}
            onSelectDriver={setSelected}
            loading={!chunks.currentLoaded}
            periods={model.periods}
            approximateOutline={!geometry}
            sectorStatus={sectorsAt(model, selected, time).status}
          />
        )}
        <ReplayControls clock={clock} model={model} />
      </section>
      <div className={`${styles.slot} ${styles.driverSlot}`} data-collapsed={collapsed.driver}>
        <SelectedDriverPanel
          clock={clock}
          model={model}
          driverNumber={selected}
          telemetry={telemetry.data}
          className={styles.driverTile}
          headerAction={<CollapseButton label="selected driver" collapsed={false} icon={IconLayoutSidebarRightCollapse} onClick={() => toggle('driver')} />}
        />
        {collapsed.driver && <CollapsedRail label="Selected driver" icon={IconLayoutSidebarRightExpand} onExpand={() => toggle('driver')} />}
      </div>
      <div ref={analysisRef} className={styles.analysisArea} data-collapsed={collapsed.analysis}>
        {!collapsed.analysis && (
          <PanelResizer panel={analysisRef} workspace={workspaceRef} onResize={analysis.setHeight} onCommit={analysis.save} onDragChange={setResizing} />
        )}
      <Panel
        className={styles.analysisTile}
        toolbar={
          <>
            <Tabs label="Replay panels" items={tabs} value={tab} onChange={setTab} size="lg" />
            <CollapseButton
              label="analysis"
              collapsed={collapsed.analysis}
              icon={collapsed.analysis ? IconLayoutBottombarExpand : IconLayoutBottombarCollapse}
              onClick={() => toggle('analysis')}
            />
          </>
        }
      >
        {tab === 'telemetry' && (
          <TelemetryPanel clock={clock} model={model} driverNumber={selected} telemetry={telemetry.data} loading={telemetry.loading} error={telemetry.error} />
        )}
        {tab === 'strategy' && <StrategyPanel clock={clock} model={model} driverNumber={selected} onSelectDriver={setSelected} />}
        {tab === 'events' && <EventsPanel clock={clock} model={model} driverNumber={selected} />}
        {tab === 'radio' && <RadioPanel clock={clock} model={model} />}
        {tab === 'weather' && <WeatherPanel clock={clock} model={model} />}
      </Panel>
        {collapsed.analysis && <CollapsedRail label="Analysis" icon={IconLayoutBottombarExpand} onExpand={() => toggle('analysis')} horizontal />}
      </div>
    </div>
  );
}

function CollapseButton({ label, collapsed, icon: IconComponent, onClick }: { label: string; collapsed: boolean; icon: Icon; onClick: () => void }) {
  const action = `${collapsed ? 'Expand' : 'Minimise'} ${label}`;
  return (
    <Button
      variant="icon"
      className={styles.collapseButton}
      aria-label={action}
      aria-expanded={!collapsed}
      title={action}
      onClick={onClick}
      icon={<IconComponent size={18} stroke={1.5} aria-hidden="true" />}
    />
  );
}

/** A minimised panel: a narrow rail with its name (vertical for side panels, a strip for the bottom one); clicking it expands the panel. */
function CollapsedRail({ label, icon: IconComponent, onExpand, horizontal = false }: { label: string; icon: Icon; onExpand: () => void; horizontal?: boolean }) {
  return (
    <button type="button" className={horizontal ? `${styles.rail} ${styles.railHorizontal}` : styles.rail} onClick={onExpand} aria-label={`Expand ${label.toLowerCase()}`} title={`Expand ${label.toLowerCase()}`}>
      <IconComponent size={18} stroke={1.5} aria-hidden="true" />
      <span className={styles.railLabel}>{label}</span>
    </button>
  );
}

/** Current race lap in the tower header, refreshed with the tower. */
function TowerLap({ clock, model }: { clock: ReplayClock; model: ReplayModel }) {
  const { time } = useClock(clock, 4);
  return (
    <span className="tabular">
      Lap {raceLapAt(model, time)}/{model.totalLaps}
    </span>
  );
}
