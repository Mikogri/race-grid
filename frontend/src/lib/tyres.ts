import type { TyreCompound } from "../api/openf1/types";

/** FIA compound colours (CSS variables from tokens.css), used only for small markers. */
export function tyreColor(compound: TyreCompound | null | undefined): string {
  switch (compound) {
    case "SOFT":
      return "var(--tyre-soft)";
    case "MEDIUM":
      return "var(--tyre-medium)";
    case "HARD":
      return "var(--tyre-hard)";
    case "INTERMEDIATE":
      return "var(--tyre-inter)";
    case "WET":
      return "var(--tyre-wet)";
    default:
      return "var(--tyre-unknown)";
  }
}
