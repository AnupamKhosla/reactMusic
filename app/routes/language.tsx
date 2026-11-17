import type { Route } from "./+types/language";
import { StationListPage } from "~/components/StationListPage";
import { mostCommon } from "~/lib/lists";
import { formatCount, paths } from "~/lib/names";
import { cacheFor, guard, loadStationPage, notFound } from "~/lib/pages.server";
import { getCountries, getGenres, languageBySlug } from "~/lib/radio.server";
import { LIST_CACHE, listSeo } from "~/lib/seo";

export async function loader({ params, request }: Route.LoaderArgs) {
  const language = await guard(() => languageBySlug(params.slug));
  if (!language) notFound();
  const [list, countries, genres] = await Promise.all([loadStationPage(request, { language: language.name }), guard(getCountries), guard(getGenres)]);
  const byCode = new Map(countries.map((c) => [c.code, c]));
  const known = new Map(genres.map((g) => [g.name, g]));
  return {
    language,
    sort: list.sort,
    page: list.page,
    hasNext: list.hasNext,
    stations: list.cards,
    countries: mostCommon(list.stations.map((s) => s.countrycode), 12)
      .map((code) => byCode.get(code))
      .filter((c) => c !== undefined)
      .map((c) => ({ to: paths.country(c.slug), label: c.name })),
    genres: mostCommon(list.stations.flatMap((s) => s.tags), 24)
      .map((t) => known.get(t))
      .filter((g) => g !== undefined)
      .slice(0, 14)
      .map((g) => ({ to: paths.genre(g.slug), label: g.label })),
  };
}

export const headers = cacheFor(LIST_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { language, stations, sort, page } = loaderData;
  const names = stations.slice(0, 3).map((s) => s.name);
  return listSeo({
    title: `${language.label} Radio Stations – Listen Live Online`,
    description: `Listen to ${formatCount(language.count)} live radio stations in ${language.label} for free${
      names.length ? `: ${names.join(", ")} and more` : ""
    }. No sign-up, no app.`,
    base: paths.language(language.slug),
    sort,
    page,
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Languages", path: "/languages" },
      { name: language.label, path: paths.language(language.slug) },
    ],
    stations: stations.map((s) => ({ id: s.id, name: s.name, path: paths.station(s) })),
  });
}

export default function LanguagePage({ loaderData }: Route.ComponentProps) {
  const { language, sort, page, hasNext, stations, countries, genres } = loaderData;
  return (
    <StationListPage
      crumbs={[{ name: "Home", path: "/" }, { name: "Languages", path: "/languages" }, { name: language.label }]}
      kicker={
        <>
          Language · <span className="num">{formatCount(language.count)}</span> stations
        </>
      }
      title={`Radio in ${language.label}`}
      intro={<p>Live stations broadcasting in {language.label}, sorted by how many people are listening today.</p>}
      base={paths.language(language.slug)}
      sort={sort}
      page={page}
      hasNext={hasNext}
      stations={stations}
      related={[
        { title: `Where ${language.label} is on air`, items: countries },
        { title: "Genres", items: genres },
      ]}
    />
  );
}
