import { SITEMAP_STATION_FILES } from "~/lib/radio.server";
import { sitemapIndex } from "~/lib/sitemap.server";

export function loader() {
  const files = ["/sitemaps/pages.xml", "/sitemaps/countries.xml", "/sitemaps/genres.xml", "/sitemaps/languages.xml"];
  for (let i = 1; i <= SITEMAP_STATION_FILES; i++) files.push(`/sitemaps/stations-${i}.xml`);
  return sitemapIndex(files);
}
