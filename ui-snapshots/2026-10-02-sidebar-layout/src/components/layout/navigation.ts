import {
  IconBrandDenodo,
  IconCalendarDue,
  IconChess,
  IconCircleDashed,
  IconDatabase,
  IconLaurelWreath,
  IconLayoutGrid,
  IconRepeat,
  IconRouteScan,
  IconUserHexagon,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  /** Match the path exactly (the dashboard, and Compare next to its Lap Comparison sub-route). */
  end?: boolean;
  /** Detail routes that belong to this section (a round page is part of Calendar). */
  sections?: string[];
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: IconLayoutGrid, end: true },
      { to: '/calendar', label: 'Calendar', icon: IconCalendarDue, sections: ['/rounds'] },
      { to: '/standings', label: 'Standings', icon: IconLaurelWreath },
      { to: '/tracks', label: 'Tracks', icon: IconRouteScan },
    ],
  },
  {
    title: 'Race',
    items: [
      { to: '/replay', label: 'Race Replay', icon: IconRepeat },
      { to: '/constructors', label: 'Constructors', icon: IconUsersGroup },
      { to: '/drivers', label: 'Drivers', icon: IconUserHexagon },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { to: '/trends', label: 'Trends', icon: IconChess },
      { to: '/compare', label: 'Compare', icon: IconDatabase, end: true },
      { to: '/performance', label: 'Performance', icon: IconBrandDenodo },
      { to: '/compare/laps', label: 'Lap Comparison', icon: IconCircleDashed },
    ],
  },
];

const within = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  return [item.to, ...(item.sections ?? [])].some((prefix) => within(pathname, prefix));
}
