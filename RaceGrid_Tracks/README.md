# RaceGrid - OpenF1 track library

Each `<circuit-name>-<circuit_key>/<year>/` directory contains:
- track.svg: white (#FFFFFF), transparent, viewBox="0 0 1000 1000", scalable 8-unit stroke.
- points.json / points.csv: reference-lap points, X/Y/Z + SVG X/Y + time + sector (1/2/3).
  is_sector_boundary marks START, S1_END, S2_END, FINISH; boundary_type is null elsewhere.
- sectors.json: inclusive sector ranges and all four time-derived boundary records.
- track_sectors.svg: three separately addressable white paths and three visual gate markers.
- source_location.json: unchanged source JSON records, including one-second time guards.
- source_lap.json / source_session.json / source_meetings.json: provenance.
- metadata.json: source query URLs, transform, selected driver/lap, quality checks and hashes.

Open index.html for a local gallery. Read manifest.json / coverage.csv for actual coverage.
Different years are separate and are NEVER substituted for missing years.

These are approximate trajectories sampled from one driver lap, not surveyed track edges,
GPS latitude/longitude, a centerline, or precise racing lines. The viewBox transformation
preserves aspect ratio and reverses the Y axis. No geometric smoothing is applied.
The SVG's final Z segment joins a gap only when it is <=1% of sampled path length.

"All points" means all accepted samples from the selected reference lap, not every driver's
samples across every session. source_location.json preserves the full downloaded response.
Boundary points can be interpolated; boundary_interpolated identifies them.
S1_END uses date_start + duration_sector_1; S2_END adds duration_sector_2.
FINISH uses date_start + lap_duration. Source timing residual is recorded, not rescaled.
These are timing sectors, not marshal sectors or mini-sectors; never equal-length thirds.
Gate locations are APPROXIMATE because source date_start and location are approximate.
A non-interpolated gate still means a sample at an estimated time, NOT an official gate.
S1_END belongs to sector 2; S2_END belongs to sector 3; FINISH stays in sector 3.
Use sectors.json ranges (both endpoints inclusive) for drawing contiguous sectors.
Do not filter only point.sector to draw paths: boundary points are shared by adjacent paths.
Raw START/FINISH coordinates may differ. The extra SVG displays one common START/FINISH
marker at START; its small accepted closure segment is in S3 only. track.svg has no markers.

Coordinate origins and units are source-local. Do not align a different session to this map
without checking the transform. Relative progress is geometric, not official lap distance.
Future/cancelled/unavailable sources and failed quality checks appear in the manifest.
"ready" means passed heuristic checks, not officially certified correctness.

Source: https://openf1.org/docs/ ; https://api.openf1.org/v1
OpenF1 is unofficial. Data/trademark/media rights remain with their respective owners.
The export does not grant new rights to the underlying data.
