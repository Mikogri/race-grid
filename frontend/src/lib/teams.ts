/** Marker / line colour for a team OpenF1 has no colour for. */
export const UNKNOWN_TEAM_COLOR = "var(--chart-neutral)";

/** OpenF1 team_colour is a hex string without '#'. */
export function teamColor(hex: string | null | undefined): string {
  return hex && /^[0-9a-f]{6}$/i.test(hex) ? `#${hex}` : UNKNOWN_TEAM_COLOR;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
