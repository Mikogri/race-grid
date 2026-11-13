// Builds compact, UI-ready circuit files from ../RaceGrid_Tracks (the local circuit library).
// Output goes to public/circuits so the app can fetch it lazily:
//   public/circuits/index.json            – one entry per circuit (list/cards)
//   public/circuits/<slug>/<year>.json    – geometry + reference lap for one circuit/year
// Only data present in the library is emitted; nothing is filled in by hand.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const libraryDir = path.resolve(root, "../../RaceGrid_Tracks");
const outDir = path.resolve(root, "../public/circuits");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const round = (value, digits) => Number(value.toFixed(digits));

// "silverstone-2/2025" -> "silverstone"
const slugFromFolder = (folder) => folder.split("/")[0].replace(/-\d+$/, "");
const slugFromName = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function pathFromPoints(points, digits) {
  return points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${round(p.svg_x, digits)},${round(p.svg_y, digits)}`,
    )
    .join("");
}

async function buildYear(folder) {
  const dir = path.join(libraryDir, folder);
  const [metadata, points, sectors, meetings] = await Promise.all([
    readJson(path.join(dir, "metadata.json")),
    readJson(path.join(dir, "points.json")),
    readJson(path.join(dir, "sectors.json")),
    readJson(path.join(dir, "source_meetings.json")),
  ]);
  const lap = await readJson(path.join(dir, "source_lap.json"));
  const meeting =
    meetings.find((m) => m.meeting_key === metadata.source.meeting_key) ??
    meetings[0];
  const svg = metadata.coordinate_system.svg;

  return {
    circuitKey: metadata.circuit_key,
    year: metadata.year,
    meeting: {
      meetingKey: meeting.meeting_key,
      meetingName: meeting.meeting_name,
      officialName: meeting.meeting_official_name,
      location: meeting.location,
      countryName: meeting.country_name,
      countryCode: meeting.country_code,
      circuitShortName: meeting.circuit_short_name,
      circuitType: meeting.circuit_type,
      gmtOffset: meeting.gmt_offset,
    },
    reference: {
      sessionKey: metadata.source.session_key,
      sessionName: metadata.source.session_name,
      driverNumber: metadata.source.driver_number,
      lapNumber: metadata.source.lap_number,
      lapDuration: metadata.source.lap_duration_seconds,
      lapDateStart: metadata.source.lap_date_start,
      sectorSeconds: [
        lap.duration_sector_1,
        lap.duration_sector_2,
        lap.duration_sector_3,
      ],
      speedTrap: { i1: lap.i1_speed, i2: lap.i2_speed, st: lap.st_speed },
    },
    // OpenF1 x/y -> SVG: svgX = x * scaleX + translateX, svgY = y * scaleY + translateY
    transform: {
      scaleX: svg.scale_x,
      scaleY: svg.scale_y,
      translateX: svg.translate_x,
      translateY: svg.translate_y,
      rotationDegrees: svg.rotation_degrees,
    },
    viewBox: svg.view_box,
    outline: pathFromPoints(points, 1),
    sectors: sectors.sectors.map((s) =>
      pathFromPoints(points.slice(s.start_index, s.end_index + 1), 1),
    ),
    gates: sectors.boundaries.map((b) => ({
      type: b.type,
      x: round(b.svg_x, 1),
      y: round(b.svg_y, 1),
      progress: round(b.progress, 5),
    })),
    // [svgX, svgY, progress] of the reference lap — used to snap live locations onto the outline.
    points: points.map((p) => [
      round(p.svg_x, 2),
      round(p.svg_y, 2),
      round(p.progress, 5),
    ]),
    quality: {
      pointCount: metadata.quality.point_count,
      checksPassed: metadata.quality.checks_passed,
    },
  };
}

async function main() {
  const manifest = await readJson(path.join(libraryDir, "manifest.json"));
  await rm(outDir, { recursive: true, force: true });

  const circuits = new Map();
  for (const entry of manifest.circuit_years) {
    const slug = entry.folder
      ? slugFromFolder(entry.folder)
      : slugFromName(entry.circuit_name);
    const circuit = circuits.get(entry.circuit_key) ?? {
      circuitKey: entry.circuit_key,
      slug,
      name: entry.circuit_name,
      years: [],
      latest: null,
    };
    circuits.set(entry.circuit_key, circuit);

    const yearEntry = { year: entry.year, status: entry.status };
    if (entry.reason) yearEntry.reason = entry.reason;
    circuit.years.push(yearEntry);

    if (entry.status !== "ready" || !entry.folder) continue;
    circuit.slug = slug;
    const detail = await buildYear(entry.folder);
    await mkdir(path.join(outDir, slug), { recursive: true });
    await writeFile(
      path.join(outDir, slug, `${entry.year}.json`),
      JSON.stringify(detail),
    );
    if (!circuit.latest || detail.year > circuit.latest.year)
      circuit.latest = detail;
  }

  const index = [...circuits.values()]
    .map(({ latest, ...circuit }) => ({
      ...circuit,
      years: circuit.years.sort((a, b) => a.year - b.year),
      readyYears: circuit.years
        .filter((y) => y.status === "ready")
        .map((y) => y.year),
      meeting: latest?.meeting ?? null,
      outline: latest ? pathFromPointsFromDetail(latest) : null,
      outlineYear: latest?.year ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "index.json"),
    JSON.stringify({ generatedAt: manifest.updated_at, circuits: index }),
  );
  console.log(
    `circuits: ${index.length} circuits written to ${path.relative(process.cwd(), outDir)}`,
  );
}

// Card thumbnails do not need sub-unit precision on a 1000-unit viewBox.
function pathFromPointsFromDetail(detail) {
  return detail.points
    .map(
      ([x, y], i) => `${i === 0 ? "M" : "L"}${Math.round(x)},${Math.round(y)}`,
    )
    .join("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
