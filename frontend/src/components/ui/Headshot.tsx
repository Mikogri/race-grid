import { useState, type ReactNode } from 'react';

/**
 * The cached, sharper copy of an OpenF1 headshot (built once by scripts/build-headshots.mjs into
 * public/assets/drivers/<code>.webp, <code> = the F1 media id in the URL), or null for other URLs.
 */
function cachedHeadshot(url: string): string | null {
  const code = url.match(/\/drivers\/[A-Z]\/[^/]+\/([a-z0-9]+)\.png/i)?.[1];
  return code ? `/assets/drivers/${code.toLowerCase()}.webp` : null;
}

/** Driver portrait: the cached WebP first, the OpenF1 image if that is missing, then `fallback`. */
export function Headshot({ url, fallback, className }: { url: string | null | undefined; fallback: ReactNode; className?: string }) {
  const cached = url ? cachedHeadshot(url) : null;
  const [failed, setFailed] = useState<'cached' | 'all' | null>(null);
  const src = cached && failed === null ? cached : failed !== 'all' ? url : null;
  if (!src) return fallback;
  return <img src={src} alt="" loading="lazy" className={className} onError={() => setFailed(src === cached ? 'cached' : 'all')} />;
}
