// Manually refreshes versioned driver headshots in public/assets/drivers/<code>.webp.
// Run `npm run headshots`, review and commit new files. Normal builds never call the API.
// (<code> = the F1 media id in the OpenF1 headshot_url, e.g. "lannor01": one file per person, stable across seasons
// even when race numbers change hands, like #1 after a title).
//
// Pipeline per driver, skipped when the cached file already exists:
//   1. headshot_url from OpenF1 (latest race of every season the app covers).
//   2. On media.formula1.com, drop the ".transform/<n>col/image.png" rendition and fetch the original (840 px).
//      URLs with a width parameter (w_720) are asked for w_1440 and q_auto:best instead.
//   3. Still smaller than the target? Upscale with a local Real-ESRGAN (realesrgan-ncnn-vulkan, photo model
//      realesrgan-x4plus) when the binary is available; step 4 brings it back to the target size, so the result is
//      at most a 2x enlargement of the source. No face restoration (GFPGAN): it changes facial features.
//   4. Resize to TARGET_PX (2x the largest portrait in the UI: the 200 px profile tile) and save WebP q90.
// Failures are reported and skipped: the app falls back to the OpenF1 image, so a missing file never breaks it.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(root, "../public/assets/drivers");
const API = "https://api.openf1.org/v1";
const FIRST_SEASON = 2023;
const TARGET_PX = 448;
const QUALITY = 90;
const REQUEST_TIMEOUT_MS = 15_000;
/** Path or name of the Real-ESRGAN ncnn binary; set REALESRGAN_BIN to use one outside PATH. */
const ESRGAN = process.env.REALESRGAN_BIN ?? "realesrgan-ncnn-vulkan";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** OpenF1 allows ~3 requests/s; one at a time with a pause is plenty for a handful of calls. */
async function openf1(endpoint, params) {
  await sleep(400);
  const res = await fetch(`${API}/${endpoint}?${new URLSearchParams(params)}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OpenF1 ${endpoint}: HTTP ${res.status}`);
  return res.json();
}

/** F1 media id of a headshot URL: ".../drivers/L/LANNOR01_Lando_Norris/lannor01.png..." -> "lannor01". */
const headshotCode = (url) =>
  url.match(/\/drivers\/[A-Z]\/[^/]+\/([a-z0-9]+)\.png/i)?.[1]?.toLowerCase() ??
  null;

/** The largest rendition the CDN serves for an OpenF1 headshot URL. */
function sourceUrl(url) {
  if (!url.includes("media.formula1.com")) return url;
  if (/\bw_\d+/.test(url))
    return url
      .replace(/\bw_\d+/, "w_1440")
      .replace(/\bq_auto(:\w+)?/, "q_auto:best");
  return url.replace(/\.transform\/.*$/, "");
}

/** Newest headshot per person, from the latest race of each season. */
async function collectHeadshots() {
  const byCode = new Map();
  const now = new Date();
  for (let year = FIRST_SEASON; year <= now.getUTCFullYear(); year++) {
    const races = (
      await openf1("sessions", { year, session_name: "Race" })
    ).filter((s) => new Date(s.date_end) < now);
    const last = races.at(-1);
    if (!last) continue;
    for (const d of await openf1("drivers", {
      session_key: last.session_key,
    })) {
      const code = d.headshot_url ? headshotCode(d.headshot_url) : null;
      if (code)
        byCode.set(code, { code, url: d.headshot_url, name: d.full_name });
    }
  }
  return [...byCode.values()];
}

function esrganAvailable() {
  const probe = spawnSync(ESRGAN, ["-h"], { stdio: "ignore", timeout: 5000 });
  return !probe.error;
}

/** Real-ESRGAN through a temp file (the ncnn binary works on files only). */
async function upscale(buffer) {
  const dir = path.join(os.tmpdir(), "racegrid-esrgan");
  await mkdir(dir, { recursive: true });
  const input = path.join(dir, "in.png");
  const output = path.join(dir, "out.png");
  await writeFile(input, await sharp(buffer).png().toBuffer());
  const run = spawnSync(
    ESRGAN,
    ["-i", input, "-o", output, "-n", "realesrgan-x4plus"],
    { stdio: "ignore", timeout: 120_000 },
  );
  if (run.status !== 0)
    throw new Error(
      `Real-ESRGAN exited with ${run.status ?? run.error?.message}`,
    );
  const result = await readFile(output);
  await rm(dir, { recursive: true, force: true });
  return result;
}

async function build({ code, url, name }, canUpscale) {
  const file = path.join(outDir, `${code}.webp`);
  if (existsSync(file)) return "cached";
  const res = await fetch(sourceUrl(url), {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  let image = Buffer.from(await res.arrayBuffer());
  const { width = 0 } = await sharp(image).metadata();
  let note = `${width}px source`;
  if (width < TARGET_PX && canUpscale) {
    image = await upscale(image);
    note += ", Real-ESRGAN";
  }
  // At most 2x the source; never enlarged by plain resampling (without Real-ESRGAN a small source keeps its size).
  const size = Math.min(TARGET_PX, width * 2);
  await sharp(image)
    .resize({
      width: size,
      height: size,
      fit: "cover",
      position: "top",
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY })
    .toFile(file);
  return note;
}

await mkdir(outDir, { recursive: true });
let drivers = [];
try {
  drivers = await collectHeadshots();
} catch (error) {
  // Offline or rate limited: keep whatever is cached; the app uses OpenF1 images for the rest.
  console.warn(
    `[headshots] could not list drivers (${error.message}); using the existing cache`,
  );
}
const missing = drivers.filter(
  (d) => !existsSync(path.join(outDir, `${d.code}.webp`)),
);
const canUpscale = missing.length > 0 && esrganAvailable();
let built = 0;
for (const driver of missing) {
  try {
    console.log(
      `[headshots] ${driver.code} ${driver.name}: ${await build(driver, canUpscale)}`,
    );
    built++;
  } catch (error) {
    console.warn(`[headshots] ${driver.code} skipped: ${error.message}`);
  }
}
console.log(
  `[headshots] ${drivers.length} drivers, ${built} built, ${drivers.length - missing.length} cached${missing.length && !canUpscale ? " (Real-ESRGAN not found; small sources kept at their own size)" : ""}`,
);
