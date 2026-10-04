# UI Rules

Short, enforceable rules for every frontend change. Values live in `DESIGN_SYSTEM.md`; tokens in
`frontend/src/styles/tokens.css`. The Figma frames (Standings, Race Replay) win any visual disagreement.

## Tokens

1. Every colour, font, font size, radius, height, shadow and duration comes from a token in `tokens.css`.
   No hex/rgb literals in components. (Exceptions: SVG user units inside a scaled viewBox; Figma's in-component
   offsets such as 5 / 10 px gaps, commented where used.)
2. A missing token is added to `tokens.css` and documented in `DESIGN_SYSTEM.md` first.
3. Colours needed from TypeScript (chart series) are passed as `var(--token)` strings. Team and tyre colours come
   from data.

## Responsiveness

4. No fixed page or panel widths. Use `clamp()` tokens (`--sidebar-width`, `--detail-width`, `--search-width`),
   `fr` shares, `auto-fit` / `auto-fill` grids and container queries. Nothing scrolls sideways.
5. Check every change at ≥ 1280 px and ≤ 640 px.

## Typography

6. Set text with role tokens: `font: var(--type-…)`. Inter everywhere; Orbitron only for the wordmark; IBM Plex Mono
   only for identifiers and page numbers.
7. 10 px (`--type-caption`) only for chips, the sub-line under a name and the timing-tower header. Uppercase only in
   the timing-tower header.
8. Comparable numbers → `.tabular`. Timing strings: Inter tabular (`.time` in tables).

## Colour

9. One accent: red `--accent`. Page titles, progress, the primary data series, leaderboard ticks. Not selection,
   active navigation or buttons.
10. Active nav / tab / segment / selected row: `--surface-active` + `--text-primary`. Hover `--surface-hover`.
11. `--danger` means error, red flag, brake, DSQ. Green `--success` for live/OK and trend up. Interval chips: green
    within DRS range, yellow otherwise.
12. Translucent surfaces for flat panels only; menus and drawers use the opaque `--surface-popover`; sticky layers use
    `--surface-bar` + `--blur-bar`.

## Components

13. Reuse `components/ui`. Extend a primitive instead of creating a page variant.
14. Cards: optional icon tile (Tabler icon, stroke 1.5) + 14/600 title; padding 12; one nesting level (inner card =
    hairline box).
15. KPIs go through `MetricGroup` (icon, label, hint, value, footer text, `Trend`).
16. Tables: framed, 31 px header bar, 40 px rows (54 with a portrait), 12/500 white text, no row rules; sortable
    columns use `SortHeader`; secondary columns hide with `.optional` / `.optionalNarrow`.
17. Buttons 30 px: one white `primary` per view; `secondary`, `ghost`, `icon`. Selects 30 px, search 35 px, tabs 31 px.
18. Icons: Tabler. Outline icons always `stroke={1.5}`.

## Layout

19. Shell: fluid sidebar (≤ 300 px, 60 px rail, drawer < 768 px), 60 px top bar, content padding `--page-gutter`,
    `--section-spacing` between sections. New routes go into `components/layout/navigation.ts`.
20. Page = `PageHeader` (red title + subtitle) → tabs → KPI cards → content (+ `DetailPanel` column).
21. Density: don't remove information to look clean.

## Motion

22. 120–180 ms, `--ease-out`; colour, background, border, opacity. Respect `prefers-reduced-motion`.

## Verification (every UI change)

23. Typecheck, lint and build pass.
24. Inspect the rendered result in the browser at desktop and narrow widths; check the console.
25. Compare against the Figma frame: composition → dimensions → spacing → alignment → type → density → colour →
    borders/radii → details.
