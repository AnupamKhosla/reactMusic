import type { Route } from "./+types/genre";
import { StationListPage } from "~/components/StationListPage";
import { mostCommon } from "~/lib/lists";
import { formatCount, paths } from "~/lib/names";
import { cacheFor, guard, loadStationPage, notFound } from "~/lib/pages.server";
import { genreBySlug, getCountries, getGenres } from "~/lib/radio.server";
import { LIST_CACHE, listSeo } from "~/lib/seo";

export async function loader({ params, request }: Route.LoaderArgs) {
  const genre = await guard(() => genreBySlug(params.slug));
  if (!genre) notFound();
  const [list, countries, genres] = await Promise.all([loadStationPage(request, { tag: genre.name }), guard(getCountries), guard(getGenres)]);
  // A genre nobody uses: a real 404 rather than an empty page for search engines to index.
  if (list.stations.length === 0 && genre.count === 0) notFound();
  const byCode = new Map(countries.map((c) => [c.code, c]));
  const topCountries = mostCommon(list.stations.map((s) => s.countrycode), 12)
    .map((code) => byCode.get(code))
    .filter((c) => c !== undefined);
  const known = new Map(genres.map((g) => [g.name, g]));
  const nearby = mostCommon(
    list.stations.flatMap((s) => s.tags).filter((t) => t !== genre.name),
    24,
  )
    .map((t) => known.get(t))
    .filter((g) => g !== undefined)
    .slice(0, 14);
  return {
    genre,
    sort: list.sort,
    page: list.page,
    hasNext: list.hasNext,
    stations: list.cards,
    countries: topCountries.map((c) => ({ to: paths.country(c.slug), label: c.name })),
    related: nearby.map((g) => ({ to: paths.genre(g.slug), label: g.label })),
  };
}

export const headers = cacheFor(LIST_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { genre, stations, sort, page } = loaderData;
  const names = stations.slice(0, 3).map((s) => s.name);
  const count = genre.count ? `${formatCount(genre.count)} ` : "";
  return listSeo({
    title: `${genre.label} Radio Stations – Listen Live Online`,
    description: `Listen to ${count}live ${genre.label.toLowerCase()} radio stations from around the world for free${
      names.length ? `: ${names.join(", ")} and more` : ""
    }. No sign-up, no app.`,
    base: paths.genre(genre.slug),
    sort,
    page,
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Genres", path: "/genres" },
      { name: genre.label, path: paths.genre(genre.slug) },
    ],
    stations: stations.map((s) => ({ id: s.id, name: s.name, path: paths.station(s) })),
  });
}

export default function GenrePage({ loaderData }: Route.ComponentProps) {
  const { genre, sort, page, hasNext, stations, countries, related } = loaderData;
  return (
    <StationListPage
      crumbs={[{ name: "Home", path: "/" }, { name: "Genres", path: "/genres" }, { name: genre.label }]}
      kicker={genre.count ? (
        <>
          Genre · <span className="num">{formatCount(genre.count)}</span> stations
        </>
      ) : "Genre"}
      title={`${genre.label} radio`}
      intro={<p>Live {genre.label.toLowerCase()} stations from around the world, sorted by how many people are listening today.</p>}
      base={paths.genre(genre.slug)}
      sort={sort}
      page={page}
      hasNext={hasNext}
      stations={stations}
      related={[
        { title: `Where ${genre.label.toLowerCase()} is on air`, items: countries },
        { title: "Related genres", items: related },
      ]}
    />
  );
}
