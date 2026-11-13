export interface NavItem {
  to: string;
  label: string;
  /** Match the path exactly (the dashboard, and Compare next to its Lap Comparison sub-route). */
  end?: boolean;
  /** Detail routes that belong to this section (a round page is part of Calendar). */
  sections?: string[];
}

/** Top menu. Drivers, constructors and tracks have no entry of their own: their pages open from Standings and Calendar. */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/calendar", label: "Calendar", sections: ["/rounds", "/tracks"] },
  {
    to: "/standings",
    label: "Standings",
    sections: ["/drivers", "/constructors"],
  },
  { to: "/replay", label: "Race Replay" },
  { to: "/trends", label: "Trends" },
  { to: "/compare", label: "Compare", end: true },
  { to: "/compare/laps", label: "Lap Comparison" },
  { to: "/performance", label: "Performance" },
];

const within = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  return [item.to, ...(item.sections ?? [])].some((prefix) =>
    within(pathname, prefix),
  );
}
