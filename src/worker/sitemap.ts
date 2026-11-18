import { paths } from "../shared/names.ts";
import { getCountries, getGenres, getLanguages, SITEMAP_STATION_FILES, sitemapStations } from "../shared/radio.ts";
import { SITE_URL } from "../shared/seo.ts";

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

export function sitemapIndex(files: string[]): Response {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    files.map((p) => `  <sitemap><loc>${escapeXml(SITE_URL + p)}</loc></sitemap>`).join("\n") +
    `\n</sitemapindex>\n`;
  return new Response(body, { headers: XML_HEADERS });
}

/** /sitemaps/<name>.xml, or null for a file that doesn't exist. Throws DirectoryUnavailable when the directory is down. */
export async function sitemapFile(file: string): Promise<Response | null> {
  const name = file.replace(/\.xml$/, "");
  if (name === file) return null;
  switch (name) {
    case "main": {
      // Stage 1: the hubs, then the biggest countries, genres and languages (each list is sorted by station count).
      const [countries, genres, languages] = await Promise.all([getCountries(), getGenres(), getLanguages()]);
      return urlset([
        ...MAIN_HUBS.map((path) => ({ path })),
        ...countries.slice(0, MAIN_COUNTRIES).map((c) => ({ path: paths.country(c.slug) })),
        ...genres
          .filter((g) => KNOWN_GENRES.has(g.name))
          .slice(0, MAIN_GENRES)
          .map((g) => ({ path: paths.genre(g.slug) })),
        ...languages.slice(0, MAIN_LANGUAGES).map((l) => ({ path: paths.language(l.slug) })),
      ]);
    }
    case "pages":
      return urlset(["/", "/top", "/countries", "/genres", "/languages", "/about", "/privacy"].map((path) => ({ path })));
    case "countries":
      return urlset((await getCountries()).map((c) => ({ path: paths.country(c.slug) })));
    case "genres":
      // Genres with enough stations to make a useful page.
      return urlset((await getGenres()).filter((g) => g.count >= 20).map((g) => ({ path: paths.genre(g.slug) })));
    case "languages":
      return urlset((await getLanguages()).filter((l) => l.count >= 5).map((l) => ({ path: paths.language(l.slug) })));
  }
  const m = /^stations-(\d+)$/.exec(name);
  const n = m ? Number(m[1]) : 0;
  if (n < 1 || n > SITEMAP_STATION_FILES) return null;
  return urlset((await sitemapStations(n)).map((s) => ({ path: paths.station(s), lastmod: s.updated })));
}

/** Lists only the current stage's files. */
export function sitemapXml(): Response {
  return sitemapIndex(sitemapFiles(SITEMAP_STAGE, SITEMAP_STATION_FILES));
}

// 18 Nov 2026: OpenAI's training crawler (GPTBot) made 26,000 of the site's 34,000 requests in a day, walking every
// station page, and pushed the Worker past the free plan's CPU limit. It is shut out; ChatGPT search
// (OAI-SearchBot) and links people open from ChatGPT (ChatGPT-User) still reach every page.
// Other orders of a list (?sort=) are the same stations again and are noindex anyway: no crawler needs them.
// /dashboard is not named here (that would advertise it); the Worker answers 404 to crawlers there.
export function robotsTxt(): Response {
  const body = [
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /*?*sort=",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
