# RaceGrid Design System (v7 — Figma "F1")

**Status: locked.** Visual source of truth: the Figma file *F1* (frames **Standings** and **Race Replay**, 1910 × 910),
exported as CSS. Implementation: `frontend/src/styles/tokens.css`. Usage rules: `UI_RULES.md`.
Supersedes v6 (Geist / Limns Admin, `references/ui/`) and `docs/design-language.md` (v1–v5).

Reference priority when deciding anything visual:

1. the Figma frames
2. the tokens in this document
3. product usability constraints (F1 data density, replay workflow, responsiveness)
4. judgment

The Figma export uses fixed frame sizes; the app does not. Widths are fluid (`clamp()`, `fr` shares, `auto-fit`
grids, container queries) and keep the frame's proportions instead of its pixels.

---

## 1. Philosophy

Dark, dense, technical, F1-flavoured. A near-black ground with a blurred red-light backdrop, translucent panels with
hairline edges, one red accent. Hierarchy comes from **surface tone → hairline → spacing → typography**; the red is
reserved for page titles, progress, the primary data series and the current position in time.

## 2. Figma analysis

| Element | Figma | Token |
|---|---|---|
| Ground | `#0D0D0D` + image at 50 % over black, blur 37.5 px | `--background` + `assets/app-background.webp` (pre-blurred) |
| Panels, sidebar, inputs | `rgba(16,16,16,.35)` | `--surface-1` |
| Raised strip (table header, KPI footer, icon tile, data-source box) | `rgba(50,50,50,.3)` | `--surface-2` |
| Active nav item / tab / segment, progress track, neutral chip | `rgba(85,85,85,.3)` | `--surface-active`, `--surface-3` |
| Panel and control edges | `rgba(75,75,75,.35)` | `--border` |
| Inner boxes, table frame, avatar ring | `#282828` | `--border-subtle` |
| Text: primary / KPI label / meta | `#FFFFFF` / `#A3A3A3` / `#858585` | `--text-primary` / `--text-secondary` / `--text-tertiary` |
| Accent (titles, progress, leaderboard ticks, current page) | `#FF3F42` | `--accent` |
| Live dot | `#10B981` | `--success` |
| Trend up chip | `#3D9678` on `#162923` | `--success-text` / `--success-subtle` |
| Interval chips | `#6BFFCD` on `#162923`, `#EEFF6B` on `#343719` | `--gap-close*`, `--gap-far*` |
| Fastest lap | `#DD00FF` | `--fastest` |
| Soft tyre ring | `#EF4444` | `--tyre-soft` (= `--danger`) |
| Sidebar / top bar | 300 / 60 px | `--sidebar-width` (fluid), `--topbar-height` |
| Content padding / section gap | 24 / 24 | `--page-gutter`, `--section-spacing` |

## 3. Typography

**Inter** for all UI text. **Orbitron 700** only for the "RaceGrid" wordmark. **IBM Plex Mono** only for identifiers
and page numbers. Timing strings use Inter with tabular digits. All comparable numbers use `tabular-nums`.

| Role | Token | Size / line | Weight |
|---|---|---|---|
| Wordmark | `--type-brand` | 18 / 23 Orbitron | 700 |
| Page title (accent colour) | `--type-page-title` | 28 / 34 (24 tablet, 22 mobile) | 500 |
| Page subtitle | `--type-page-subtitle` | 12 / 15 | 500 |
| Large heading | `--type-heading-lg` | 18 / 24 | 600 |
| Panel / card title | `--type-heading` | 14 / 17 | 600 |
| Body | `--type-body` | 13 / 18 | 500 |
| Table / dense | `--type-body-dense` | 12 / 15 | 500 |
| Secondary / meta | `--type-secondary`, `--type-meta` | 12 / 15–16 | 500 |
| Caption (chips, sub-lines, tower header) | `--type-caption` | 10 / 12 | 500 |
| Navigation | `--type-nav` | 13 / 16 | 500 |
| Nav group label | `--type-nav-group` | 12 / 15, sentence case | 600 |
| Tab / segment / label | `--type-label` | 12 / 15 | 500 |
| Button | `--type-button` | 13 / 16 | 550 |
| Top-bar status | `--type-status` | 14 / 17 | 500 |
| KPI label / value | `--type-kpi-label` / `--type-kpi-value` | 14 / 17 · 32 / 39 (26 mobile) | 600 |
| Leaderboard / small metric | `--type-metric` | 14 / 17 | 500 |
| Mono | `--type-mono` | 12 / 16 Plex Mono | 400 |

Role tokens are `font` shorthands: `font: var(--type-heading);` (declare `tabular-nums` after it).

## 4. Spacing

Scale `--space-1…16` (4 8 12 16 20 24 32 40 48 64). Figma's own in-component values (5, 6, 10, 18 px) are kept where
the frame uses them (badge → title 10, tick bars, chip padding) and noted in the CSS.

| Purpose | Value | Token |
|---|---|---|
| Page padding — desktop / tablet / mobile | 24 / 20 / 16 | `--page-gutter` |
| Between sections and main columns | 24 (16 ≤ 1024 px) | `--section-spacing`, `--grid-gap` |
| Closely related panels (replay workspace, card grids) | 16 | `--grid-gap-tight` |
| Card padding | 12 | `--panel-padding` |
| Table panel padding | 18 | `--panel-padding-lg` |
| Header → content | 16 | `--panel-header-gap` |

## 5. Application shell

| Element | Value | Token |
|---|---|---|
| Sidebar | `clamp(232px, 16vw, 300px)`; 60 px rail when collapsed; drawer < 768 px | `--sidebar-width`, `--sidebar-width-collapsed` |
| Brand row | 60 px: 35 px logo, Orbitron wordmark, collapse toggle (opacity .5) | — |
| Nav groups | Overview · Race · Analysis, 12/600 sentence-case labels, hairlines between groups | `navigation.ts` |
| Nav item | 32 px, padding 10, icon 18 (opacity .4, 1 when active) → 12 gap → 13/500 text | `--nav-item-*`, `--nav-icon-size` |
| Active item | `--surface-active` + 1 px `--border`, white text | — |
| Sidebar footer | "Data source: OpenF1" box (green dot; pulsing while loading, amber when rate limited) | — |
| Top bar | 60 px, frosted `--surface-bar`, hairline below: search (`--search-width`, ⌘K), latest race status, season select with calendar icon, white "Quick Analyze" | `--topbar-height` |
| Detail column | `clamp(300px, 22vw, 372px)` | `--detail-width` |

Menu: **Overview** Dashboard, Calendar, Standings, Tracks · **Race** Race Replay, Constructors, Drivers ·
**Analysis** Trends, Compare, Performance, Lap Comparison. Icons (Tabler, stroke 1.5): layout-grid, calendar-due,
laurel-wreath, route-scan, repeat, users-group, user-hexagon, chess, database, brand-denodo, circle-dashed.

## 6. Radii

| Use | Value | Token |
|---|---|---|
| Trend chip, kbd | 4 | `--radius-xs` |
| Interval chip, badge, speed segment, pagination | 5 | `--radius-chip` |
| Controls, tabs, nav items, icon tiles | 6 | `--radius-control` |
| Panels, cards, table frame, popovers | 8 | `--radius-panel`, `--radius-popover` |
| Avatars, team bars, progress bars | pill | `--radius-pill` |

## 7. Control and row sizes

| Element | Value | Token |
|---|---|---|
| Replay transport buttons / speed segments | 27 / 25 | `--control-height-sm` |
| Buttons, selects | 30 | `--control-height` |
| Search | 35 | `--control-height-lg` |
| Tabs | 31 | `--tab-height` |
| Card icon tile | 28 (table panel 32) | `--icon-badge-size(-lg)` |
| Badge / chip | 20 | `--badge-height` |
| Avatar sm / md / lg | 24 / 35 / 64 | `--avatar-size*` |
| Table header / row / portrait row / timing row | 31 / 40 / 54 / 30 | `--table-*-height*` |

Icons: Tabler; outline icons always `stroke={1.5}`; filled variants (play, info-hexagon) where Figma uses them.

## 8. Colour

Tokens in `tokens.css` (§2). Rules:

- **Accent red** `--accent #FF3F42`: page titles, primary chart series, progress (season, replay timeline), leaderboard
  ticks, current-page markers. Not for selection, active nav or buttons (neutral / inverted).
- **Danger** `--danger #EF4444`: errors, F1 red flag, brake, DSQ, soft tyre.
- **Success** `--success #10B981` dots; `--success-text` on `--success-subtle` for trend-up chips.
- **Race data**: team colours as 2–3 px bars, tyre compounds as rings, `--fastest` purple text, interval chips
  (green within DRS range < 1 s, yellow otherwise).
- Opaque `--surface-popover` for menus and the mobile drawer; translucent surfaces only for flat panels.

## 9. Surfaces, borders, elevation

- Backdrop: `body::before`, fixed, pre-blurred image (`assets/app-background.webp`, 3 KB) — no runtime `filter`.
- Panels: `--surface-1`, 1 px `--border`, radius 8, no shadow, no backdrop blur.
- Sticky layers (top bar, table headers) add `--surface-bar` + `--blur-bar` so scrolled content stays legible.
- One nesting level: a `Card` inside a card is a hairline box (`--border-subtle`, radius 8, padding 12) — Figma "Data".

## 10. Cards and panels

| Part | Spec |
|---|---|
| Header | optional 28 px icon tile (icon 18, opacity .5) → 10 px → 14/600 title; actions right |
| Body | padding 12, 16 below the header |
| Footer | 37 px strip on `--surface-2`, 12 px text left, chip right |
| Table panel (`Panel` with toolbar) | padding 18, 32 px icon tile, framed table inside |

## 11. KPI cards (`MetricGroup`)

Separate cards in an `auto-fit` grid (min 220 px), gap 24: icon tile + label (14/600 secondary) + info hint
(filled info-hexagon, opacity .3) → 32/600 value → footer (context + `Trend` chip: up green, down red, flat grey).

## 12. Tables

| Property | Value |
|---|---|
| Frame | 1 px `--border-subtle`, radius 8 (none when the card is flush) |
| Header | 31 px bar on `--surface-2`, 12/500 white, sortable columns show a move-vertical icon (`SortHeader`) |
| Rows | 40 px; 54 px with a portrait; no row rules; hover `--surface-hover`, selected `--surface-active` |
| Text | 12/500 white; muted `--text-tertiary`; one `.strong` value per row |
| Numbers | tabular; Figma aligns them left under their header |
| Driver cell | 35 px round portrait → name 12/500 over country 10/500 tertiary |
| Team cell | 3 × 15 px team bar → name |

Classes (`Table.module.css`): `.wrap`, `.table`, `.dense`, `.large`, `.right`, `.center`, `.time`, `.strong`,
`.muted`, `.primary`, `.selected`, `.clickable`, `.link`, `.sort`, `.caption`, `.optional`, `.optionalNarrow`.
Cell padding comes from `--table-cell-padding-x` / `--table-edge-padding-x` (tightened in narrow containers).

## 13. Replay

- Workspace: timing | map + transport over the analysis tabs | selected driver; column shares 21.5 / 57 / 19.5 fr,
  gap 16, fills the viewport; stacks below 1380 px and 900 px.
- Timing: plain stopwatch title, 10 px uppercase header, 30 px rows, `#`, driver (2 × 12 bar + acronym), interval
  chip, last lap (purple when fastest), tyre ring; retired rows at 30 % with an "Out" chip.
- Transport: 27 px skip buttons, white play button, 1×/2×/5×/10× segmented, 4 px timeline (red progress, 3 × 10 white
  playhead), "elapsed / total" and "Lap n / N".

## 14. Charts

Shared theme (`--chart-*`): `--chart-1` accent red, `--chart-2` periwinkle, `--chart-3` green, `--chart-4` amber,
`--chart-neutral` grey baseline; 12 px labels, 2 px primary line, dashed horizontal grid.

## 15. Motion

120–180 ms, `--ease-out`; colour, border, opacity only. Route fades (`motion.css`). The drawer is the one slide.

## 16. Components

| Component | Spec |
|---|---|
| `AppLayout` | sidebar + (top bar, content). Content padding `--page-gutter`, gap `--section-spacing` |
| `Sidebar` | §5; collapse toggle in the brand row (desktop), drawer on mobile opened from the top bar |
| `TopBar` | §5; menu button only < 768 px; status hidden < 1180 px; Quick Analyze icon-only on mobile (links to the latest round) |
| `GlobalSearch` | 35 px, ⌘K / Ctrl+K / "/" focus, results under the field |
| `PageHeader` | red title, subtitle (`description`), key facts on the subtitle line, back link, actions |
| `Card` / `Panel` / `DetailPanel` / `IconBadge` | §10 |
| `MetricGroup` / `Trend` | §11 |
| `SortHeader` + `useSort` / `sortBy` (`sort.ts`) | sortable table headers |
| `Tabs` | 31 px pills, 12/500, sliding neutral pill |
| `Segmented` | 27 px bordered track, 25 px segments |
| `Button` | 30 px; `primary` white / #111; `secondary` translucent + hairline; `ghost`; `icon` |
| `Select` | 30 px, optional leading icon, 12 px chevron; opaque menu |
| `Badge` | 20 px, radius 5, 10 px text |
| `Avatar` | round, `--border-subtle` ring |
| `TeamMarker` | `xs` 2 × 12, `sm` 3 × 15, `lg` 4 × 36 |
| `TyreBadge` | 18 × 17 ring in the compound colour, white initial |
| Standings `Leaderboard` / `RecentForm` | top 5 with 1 px tick bars (`--tick-pitch` 6 px, red share of the leader); last five GP results |

## 17. Deviations from the Figma export

| Topic | Figma | Implemented |
|---|---|---|
| Fixed widths (300 sidebar, 372 cards, 336/894/300 replay) | px | fluid clamps / fr shares / auto-fit grids |
| Table pagination ("Rows per page: 22") | shown | omitted: a season has ~20–24 drivers, one page |
| Standings KPI content | placeholder "Points 79 %" ×4 | Leader, Lead, Season progress, Points available (real data) |
| Right column second card | duplicate Leaderboard | Quick summary of the selected driver (row button) |
| Replay bottom panel | empty 200 px | the analysis tabs (telemetry, strategy, events, radio, weather) |
| Tower tyre age | not shown | in the ring's tooltip |
| Backdrop blur | runtime `filter: blur(37.5px)` | pre-blurred image, no runtime cost |
