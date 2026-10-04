import type { CSSProperties, ReactNode } from 'react';
import { SurfaceContext } from './cardContext';
import { Bone, Skeleton } from './StateViews';
import styles from './PageSkeleton.module.css';

export type SkeletonLayout = 'dashboard' | 'table' | 'cards' | 'charts' | 'profile' | 'replay' | 'detail';

/**
 * Loading state shaped like the page it stands in for: the same grid, panels and proportions, so the content
 * lands where the bones were. Panels rise in one after another under the shared light sweep.
 */
export function PageSkeleton({ layout, header = false }: { layout: SkeletonLayout; header?: boolean }) {
  return (
    <div className={`${styles.page} rg-stagger`} aria-busy="true" aria-label="Loading">
      {header && <HeaderBones />}
      {LAYOUTS[layout]}
    </div>
  );
}

function HeaderBones() {
  return (
    <div className={styles.header}>
      <Bone width="120px" height="10px" />
      <Bone width="300px" height="28px" />
      <Bone width="380px" height="10px" />
    </div>
  );
}

/** A panel with a title bone; its content counts as "inside a card" so row skeletons do not draw a second frame. */
function Panel({ children, title = true, className, style }: { children?: ReactNode; title?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div className={[styles.panel, className].filter(Boolean).join(' ')} style={style}>
      {title && <Bone width="140px" height="12px" />}
      <SurfaceContext value="panel">{children}</SurfaceContext>
    </div>
  );
}

function Kpis({ count }: { count: number }) {
  return (
    <div className={`${styles.kpis} rg-stagger`} style={{ '--count': count } as CSSProperties}>
      {Array.from({ length: count }, (_, i) => (
        <Panel key={i} title={false}>
          <Bone width="45%" height="8px" />
          <Bone width="60%" height="24px" />
          <Bone width="35%" height="8px" />
        </Panel>
      ))}
    </div>
  );
}

function ChartPanel({ height = 240 }: { height?: number }) {
  return (
    <Panel>
      <div className={styles.legend}>
        <Bone width="56px" height="8px" />
        <Bone width="56px" height="8px" />
        <Bone width="56px" height="8px" />
      </div>
      <Bone height={`${height}px`} block />
    </Panel>
  );
}

const TableLayout = (
  <>
    <Kpis count={4} />
    <Panel>
      <Skeleton rows={10} />
    </Panel>
  </>
);

const LAYOUTS: Record<SkeletonLayout, ReactNode> = {
  table: TableLayout,

  detail: (
    <>
      <Kpis count={6} />
      <div className={styles.tabs}>
        {[72, 96, 108, 120, 92, 72].map((w, i) => (
          <Bone key={i} width={`${w}px`} height="31px" />
        ))}
      </div>
      <Panel>
        <Skeleton rows={10} />
      </Panel>
    </>
  ),

  cards: (
    <div className={`${styles.cards} rg-stagger`}>
      {Array.from({ length: 8 }, (_, i) => (
        <Panel key={i} title={false}>
          <div className={styles.cardHead}>
            <Bone width="22px" height="15px" />
            <Bone width="64px" height="18px" />
          </div>
          <Bone block className={styles.square} />
          <Bone width="70%" height="14px" />
          <Bone width="45%" height="9px" />
        </Panel>
      ))}
    </div>
  ),

  charts: (
    <>
      <div className={styles.toolbar}>
        <Bone width="170px" height="31px" />
        <Bone width="150px" height="27px" />
      </div>
      <div className={`${styles.twoCol} rg-stagger`}>
        <ChartPanel />
        <ChartPanel />
        <ChartPanel />
        <ChartPanel />
      </div>
    </>
  ),

  dashboard: (
    <>
      <div className={`${styles.dashboardTop} rg-stagger`}>
        <Panel title={false} className={styles.hero}>
          <div className={styles.stack}>
            <Bone width="55%" height="8px" />
            <Bone width="80%" height="28px" />
            <Bone width="35%" height="10px" />
            <Bone height="72px" block />
            <div className={styles.twoColTight}>
              <Bone height="40px" block />
              <Bone height="40px" block />
            </div>
            <div className={styles.row}>
              <Bone width="120px" height="30px" />
              <Bone width="120px" height="30px" />
            </div>
          </div>
          <Bone block className={styles.fill} />
        </Panel>
        <div className={styles.stack}>
          <Panel title={false}>
            <Bone width="40%" height="8px" />
            <Bone width="70%" height="18px" />
            <Bone width="50%" height="36px" />
          </Panel>
          <Panel>
            <Bone height="22px" block />
            <Bone width="80%" height="18px" />
          </Panel>
        </div>
      </div>
      <div className={`${styles.dashboardBottom} rg-stagger`}>
        <Panel>
          <Skeleton rows={8} />
        </Panel>
        <Panel>
          <Skeleton rows={8} />
        </Panel>
      </div>
    </>
  ),

  profile: (
    <>
      <Panel title={false} className={styles.profileHero}>
        <Bone block className={styles.square} />
        <div className={styles.stack}>
          <Bone width="48px" height="18px" />
          <Bone width="60%" height="30px" />
          <Bone width="40%" height="10px" />
          <Bone width="90%" height="10px" />
          <Bone width="75%" height="10px" />
        </div>
        <div className={styles.stats}>
          {Array.from({ length: 6 }, (_, i) => (
            <Bone key={i} height="58px" block />
          ))}
        </div>
      </Panel>
      <div className={`${styles.twoCol} rg-stagger`}>
        <ChartPanel height={180} />
        <ChartPanel height={180} />
      </div>
      <div className={`${styles.threeCol} rg-stagger`}>
        {[0, 1, 2].map((i) => (
          <Panel key={i}>
            <Skeleton rows={3} />
          </Panel>
        ))}
      </div>
    </>
  ),

  replay: (
    <>
      <Panel title={false} className={styles.replayHeader}>
        <Bone width="64px" height="64px" block />
        <div className={styles.stack}>
          <Bone width="140px" height="10px" />
          <Bone width="260px" height="26px" />
        </div>
        <div className={styles.row}>
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} width="90px" height="34px" block />
          ))}
        </div>
      </Panel>
      <div className={`${styles.replay} rg-stagger`}>
        <Panel>
          <Skeleton rows={12} />
        </Panel>
        <div className={styles.stack}>
          <Panel title={false} className={styles.fillPanel}>
            <Bone block className={styles.fill} />
            <Bone height="32px" block />
          </Panel>
          <Panel className={styles.analysis}>
            <Bone block className={styles.fill} />
          </Panel>
        </div>
        <Panel>
          <div className={styles.row}>
            <Bone width="48px" height="48px" block />
            <div className={styles.stack}>
              <Bone width="110px" height="12px" />
              <Bone width="80px" height="9px" />
            </div>
          </div>
          <div className={styles.threeColTight}>
            <Bone height="44px" block />
            <Bone height="44px" block />
            <Bone height="44px" block />
          </div>
          <Skeleton rows={5} />
        </Panel>
      </div>
    </>
  ),
};
