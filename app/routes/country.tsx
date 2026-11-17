import { redirect } from "react-router";
import type { Route } from "./+types/country";
import { StationListPage } from "~/components/StationListPage";
import { listHref, mostCommon, parsePage, parseSort } from "~/lib/lists";
import { formatCount, nameSlug, paths } from "~/lib/names";
import { cacheFor, guard, loadStationPage, notFound } from "~/lib/pages.server";
import { countryBySlug, getGenres, getLanguages } from "~/lib/radio.server";
import { LIST_CACHE, listSeo } from "~/lib/seo";

export async function loader({ params, request }: Route.LoaderArgs) {
  const country = await guard(() => countryBySlug(params.slug));
  if (!country) notFound();
  if (country.slug !== params.slug) {
    const url = new URL(request.url);
    const sort = parseSort(url.searchParams.get("sort")).key;
    throw redirect(listHref(paths.country(country.slug), sort, parsePage(url.searchParams.get("page")) || 1), 301);
  }
  const [list, genres, languages] = await Promise.all([
    loadStationPage(request, { countrycode: country.code }),
    guard(getGenres),
    guard(getLanguages),
  ]);
  const genreSlugs = new Map(genres.map((g) => [g.name, g]));
  const languageNames = new Map(languages.map((l) => [l.name, l]));
  const topTags = mostCommon(list.stations.flatMap((s) => s.tags), 30)
    .map((t) => genreSlugs.get(t))
    .filter((g) => g !== undefined)
    .slice(0, 16);
  const topLanguages = mostCommon(list.stations.flatMap((s) => s.languages), 12)
    .map((l) => languageNames.get(l))
    .filter((l) => l !== undefined)
    .slice(0, 8);
  return {
    country,
    sort: list.sort,
    page: list.page,
    hasNext: list.hasNext,
    stations: list.cards,
    genres: topTags.map((g) => ({ to: paths.genre(g.slug), label: g.label })),
    languages: topLanguages.map((l) => ({ to: paths.language(nameSlug(l.name)), label: l.label })),
  };
}

export const headers = cacheFor(LIST_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { country, stations, sort, page } = loaderData;
  const names = stations.slice(0, 3).map((s) => s.name);
  return listSeo({
    title: `${country.name} Radio Stations – Listen Live Online`,
    description: `Listen to ${formatCount(country.count)} live radio stations from ${country.name} online for free${
      names.length ? `: ${names.join(", ")} and more` : ""
    }. No sign-up, no app.`,
    base: paths.country(country.slug),
    sort,
    page,
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Countries", path: "/countries" },
      { name: country.name, path: paths.country(country.slug) },
    ],
    stations: stations.map((s) => ({ id: s.id, name: s.name, path: paths.station(s) })),
  });
}

export default function CountryPage({ loaderData }: Route.ComponentProps) {
  const { country, sort, page, hasNext, stations, genres, languages } = loaderData;
  return (
    <StationListPage
      crumbs={[{ name: "Home", path: "/" }, { name: "Countries", path: "/countries" }, { name: country.name }]}
      kicker={
        <>
          <span className="num">{country.code}</span> · <span className="num">{formatCount(country.count)}</span> stations
        </>
      }
      title={`Radio in ${country.name}`}
      intro={<p>Live radio stations from {country.name}, sorted by how many people are listening today. Press play to listen right here.</p>}
      base={paths.country(country.slug)}
      sort={sort}
      page={page}
      hasNext={hasNext}
      stations={stations}
      related={[
        { title: `Genres in ${country.name}`, items: genres },
        { title: `Languages on air in ${country.name}`, items: languages },
      ]}
    />
  );
}
