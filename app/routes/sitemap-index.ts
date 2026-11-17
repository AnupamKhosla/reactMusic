import { SITEMAP_STATION_FILES } from "~/lib/radio.server";
import { SITEMAP_STAGE, sitemapFiles, sitemapIndex } from "~/lib/sitemap.server";

// Lists only the current stage's files (sitemap.server.ts explains the stages).
export function loader() {
  return sitemapIndex(sitemapFiles(SITEMAP_STAGE, SITEMAP_STATION_FILES));
}
