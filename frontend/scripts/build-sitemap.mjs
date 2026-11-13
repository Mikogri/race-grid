// Writes public/sitemap.xml and public/robots.txt at build time.
// Lists the app's fixed pages plus one page per circuit in the local library (public/circuits/index.json, written
// by build-circuits.mjs just before). Rounds, drivers and replays depend on live OpenF1 data, so they are left out.
// The site address comes from SITE_URL (set it in Cloudflare Pages once the domain is attached).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(root, "../public");
const site = (process.env.SITE_URL ?? "https://race-grid.pages.dev").replace(
  /\/+$/,
  "",
);

const PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/calendar", changefreq: "daily", priority: "0.9" },
  { path: "/standings", changefreq: "daily", priority: "0.9" },
  { path: "/replay", changefreq: "weekly", priority: "0.8" },
  { path: "/trends", changefreq: "weekly", priority: "0.7" },
  { path: "/performance", changefreq: "weekly", priority: "0.7" },
  { path: "/compare", changefreq: "monthly", priority: "0.6" },
  { path: "/compare/laps", changefreq: "monthly", priority: "0.6" },
  { path: "/drivers", changefreq: "weekly", priority: "0.6" },
  { path: "/constructors", changefreq: "weekly", priority: "0.6" },
  { path: "/tracks", changefreq: "monthly", priority: "0.6" },
];

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let circuits = [];
try {
  circuits =
    JSON.parse(
      await readFile(path.join(publicDir, "circuits/index.json"), "utf8"),
    ).circuits ?? [];
} catch (error) {
  console.warn(
    `[sitemap] circuit index unavailable (${error.message}); circuit pages are not listed`,
  );
}

const today = new Date().toISOString().slice(0, 10);
const entries = [
  ...PAGES,
  ...circuits.map((c) => ({
    path: `/tracks/${encodeURIComponent(c.slug)}`,
    changefreq: "monthly",
    priority: "0.5",
  })),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url>\n    <loc>${escape(site + e.path)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
  )
  .join("\n")}
</urlset>
`;

await writeFile(path.join(publicDir, "sitemap.xml"), xml);
await writeFile(
  path.join(publicDir, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
);
console.log(`[sitemap] ${entries.length} URLs for ${site}`);
