# RaceGrid (frontend)

Frontend-only Formula 1 analysis app: React 19 + TypeScript + Vite, React Router, TanStack Query.
Visual language: `../docs/design-language.md` (derived from `../references/reference-ui-design.png`).

```bash
npm ci
npm run dev        # also regenerates public/circuits from ../RaceGrid_Tracks
npm run typecheck
npm run lint
npm run build
```

Use Node.js 24. Deployment settings are documented in the [root README](../README.md#cloudflare-pages).
Builds generate circuit assets locally and never download headshots. Driver WebPs are versioned in
`public/assets/drivers`; run `npm run headshots` explicitly to fetch missing portraits, then review and commit them.

## Data sources — kept separate

| Layer              | Where                                                                    | What                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Raw OpenF1         | `src/api/openf1/`                                                        | Typed client for `https://api.openf1.org/v1` (no API key).                                                                 |
| Local circuit data | `../RaceGrid_Tracks` → `scripts/build-circuits.mjs` → `public/circuits/` | Outlines, sectors, OpenF1→SVG transform, reference lap. Static UI data only.                                               |
| RaceGrid derived   | `src/analytics/`                                                         | Pure functions: pace, strategy, benchmarks, Performance Index, trends, replay model. Always labelled as derived in the UI. |

### OpenF1 client (`src/api/openf1`)

- **Rate limits**: OpenF1 allows ~3 req/s and ~30 req/min without a key. Every request goes through a FIFO queue
  (`rateLimiter.ts`); on HTTP 429 the queue pauses for `retry-after`. The topbar shows the waiting state.
- **Persistence**: responses are stored in the browser Cache Storage. Sessions that ended > 6 h ago are immutable;
  running-season lists refresh every 15 min.
- **"No results found"** (HTTP 404) is treated as an empty list.
- **Season queries** use `session_key` ranges, so a whole season (results, grids, drivers, standings) is ~7 requests.
- Abort signals from TanStack Query cancel queued or in-flight requests.

### Race Replay loading

1. Preparation (~11 requests, thinking-orb loader): laps, positions, intervals, stints, pits, overtakes,
   race control, weather, team radio, results, drivers.
2. Streaming: car locations for **all cars in 2-minute windows** (current + next window only, ~1.3 MB each);
   telemetry only for the **selected driver**, in the same windows.
3. OpenF1 location is ~3.7 Hz and approximate. Each sample is projected onto the local reference lap and cars are
   interpolated **along the track** between samples; pit-lane samples (far from the reference line) are drawn raw.
   Without a local outline for that season, the outline is reconstructed from the leader's second lap.

## Code layout

```
src/api/openf1      raw client, endpoint map, types
src/data            query hooks (season, meeting, session data, circuits, race pace)
src/analytics       derived analytics (pure, no React)
src/components      reusable UI (ui/, charts/, layout/) + domain widgets (StintChart, CircuitCard…)
src/features        screens: dashboard, calendar, round, standings, driver, constructor,
                    tracks, replay, compare, performance, trends
src/vendor          thinking-orbs canvas engine (MIT, see its LICENSE/README)
```

## Known data limits (by design, not bugs)

- Turn count and official circuit length are not in OpenF1 or the local library. Track Details shows an
  _observed_ lap distance integrated from reference-lap speed telemetry.
- No surrounding street map: OpenF1 coordinates are not geo-referenced.
- Benchmarks are the best values inside OpenF1 coverage (2023+), not official lap records.
- Team radio lists only clips OpenF1 publishes; an empty state is shown otherwise.
- The Performance Index measures the team + car + drivers package; it cannot isolate the car.
