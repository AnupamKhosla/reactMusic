import type { Route } from "./+types/sitemap";
import { paths } from "~/lib/names";
import { guard, notFound } from "~/lib/pages.server";
import { getCountries, getGenres, getLanguages, SITEMAP_STATION_FILES, sitemapStations } from "~/lib/radio.server";
import { KNOWN_GENRES, MAIN_COUNTRIES, MAIN_GENRES, MAIN_HUBS, MAIN_LANGUAGES, urlset } from "~/lib/sitemap.server";

export async function loader({ params }: Route.LoaderArgs) {
  const name = params.file.replace(/\.xml$/, "");
  if (name === params.file) notFound();

  switch (name) {
    case "main": {
      // Stage 1: the hubs, then the biggest countries, genres and languages (each list is sorted by station count).
      const [countries, genres, languages] = await Promise.all([guard(getCountries), guard(getGenres), guard(getLanguages)]);
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
    case "countries": {
      const list = await guard(getCountries);
      return urlset(list.map((c) => ({ path: paths.country(c.slug) })));
    }
    case "genres": {
      // Genres with enough stations to make a useful page.
      const list = await guard(getGenres);
      return urlset(list.filter((g) => g.count >= 20).map((g) => ({ path: paths.genre(g.slug) })));
    }
    case "languages": {
      const list = await guard(getLanguages);
      return urlset(list.filter((l) => l.count >= 5).map((l) => ({ path: paths.language(l.slug) })));
    }
  }

  const m = /^stations-(\d+)$/.exec(name);
  const file = m ? Number(m[1]) : 0;
  if (file < 1 || file > SITEMAP_STATION_FILES) notFound();
  const stations = await guard(() => sitemapStations(file));
  return urlset(stations.map((s) => ({ path: paths.station(s), lastmod: s.updated })));
}
