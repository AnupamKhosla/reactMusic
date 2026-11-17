import { SITE_URL } from "./seo";

/**
 * Search engines get the site in stages (owner, 2026-11-17): a new domain that hands Google thousands of
 * look-alike station pages at once can be taken for spam, so the main pages go first and get indexed.
 * Raise SITEMAP_STAGE and deploy only once Search Console shows most of the current stage indexed:
 *   1   main pages: the hubs and the biggest countries, genres and languages (56 addresses)
 *   2   every hub, country and language page (about 410)
 *   3   + every genre page with 20+ stations (about 580 more)
 *   4+  + one more station file (500 stations each) per stage, up to SITEMAP_STATION_FILES
 * Pages not yet in the sitemap still work and are linked from the site; they are just not pushed to Google.
 */
export const SITEMAP_STAGE = 1;
export const MAIN_HUBS = ["/", "/top", "/countries", "/genres", "/languages", "/about"];
export const MAIN_COUNTRIES = 20;
export const MAIN_GENRES = 20;
export const MAIN_LANGUAGES = 10;
// The directory's biggest tags include noise (place names, uploaders' names, "musica"); the main sitemap takes
// only well-known kinds of programme, in the directory's order.
export const KNOWN_GENRES = new Set([
  "pop", "news", "rock", "talk", "dance", "hits", "oldies", "classical", "jazz", "electronic", "christian",
  "public radio", "country", "hip hop", "hiphop", "rap", "alternative", "indie", "chillout", "ambient", "lounge",
  "sports", "blues", "reggae", "metal", "folk", "house", "techno", "trance", "soul", "funk", "rnb", "latin",
  "classic rock", "top 40", "60s", "70s", "80s", "90s", "00s", "religious", "gospel", "world music", "kids",
  "comedy", "easy listening", "adult contemporary", "soundtrack", "edm", "disco", "punk", "bollywood", "k-pop",
]);

/** The sitemap files /sitemap.xml lists at a stage. */
export function sitemapFiles(stage: number, stationFiles: number): string[] {
  if (stage <= 1) return ["/sitemaps/main.xml"];
  const files = ["/sitemaps/pages.xml", "/sitemaps/countries.xml", "/sitemaps/languages.xml"];
  if (stage >= 3) files.push("/sitemaps/genres.xml");
  for (let i = 1; i <= Math.min(stage - 3, stationFiles); i++) files.push(`/sitemaps/stations-${i}.xml`);
  return files;
}

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
};

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);
}

export function urlset(urls: { path: string; lastmod?: string }[]): Response {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${escapeXml(SITE_URL + u.path)}</loc>${u.lastmod ? `<lastmod>${escapeXml(u.lastmod.slice(0, 10))}</lastmod>` : ""}</url>`)
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: XML_HEADERS });
}

export function sitemapIndex(paths: string[]): Response {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths.map((p) => `  <sitemap><loc>${escapeXml(SITE_URL + p)}</loc></sitemap>`).join("\n") +
    `\n</sitemapindex>\n`;
  return new Response(body, { headers: XML_HEADERS });
}
