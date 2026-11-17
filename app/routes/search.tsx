import { useEffect } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/search";
import { SearchBox } from "~/components/SearchBox";
import { StationGrid } from "~/components/StationCard";
import { Chips, Container, Notice, PageHeading, Section } from "~/components/ui";
import { track } from "~/lib/analytics.client";
import { PER_PAGE, parsePage, toCard } from "~/lib/lists";
import { paths } from "~/lib/names";
import { guard, notFound } from "~/lib/pages.server";
import { getCountries, getGenres, getLanguages, searchStations } from "~/lib/radio.server";
import { seo } from "~/lib/seo";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const page = parsePage(url.searchParams.get("page"));
  if (page === 0) notFound();
  if (q.length < 2) return { q, page, hasNext: false, stations: [], matches: [] };
  const needle = q.toLowerCase();
  const [found, countries, genres, languages] = await guard(() =>
    Promise.all([searchStations({ name: q, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE }), getCountries(), getGenres(), getLanguages()]),
  );
  const matches = [
    ...countries.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 4).map((c) => ({ to: paths.country(c.slug), label: `${c.name} radio` })),
    ...genres.filter((g) => g.name.includes(needle)).slice(0, 4).map((g) => ({ to: paths.genre(g.slug), label: `${g.label} radio` })),
    ...languages.filter((l) => l.name.includes(needle)).slice(0, 2).map((l) => ({ to: paths.language(l.slug), label: `Radio in ${l.label}` })),
  ];
  return { q, page, hasNext: found.length > PER_PAGE, stations: found.slice(0, PER_PAGE).map(toCard), matches };
}

export function headers() {
  return { "Cache-Control": "public, max-age=60, s-maxage=300" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const q = loaderData?.q;
  return seo({ title: q ? `“${q}” – Radio search` : "Search radio stations", path: "/search", noindex: true });
}

export default function Search({ loaderData }: Route.ComponentProps) {
  const { q, page, hasNext, stations, matches } = loaderData;
  useEffect(() => {
    if (q.length >= 2 && page === 1) track("search", { label: q.toLowerCase(), value: stations.length });
  }, [q, page, stations.length]);

  const pageHref = (p: number) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ""}`;
  return (
    <Container>
      <PageHeading kicker="Search" title={q ? `“${q}”` : "Find a station"} />
      <div className="mt-6 max-w-2xl">
        <SearchBox defaultValue={q} key={q} autoFocus={!q} />
      </div>
      {matches.length > 0 ? (
        <div className="mt-6">
          <Chips items={matches} label="Matching countries, genres and languages" />
        </div>
      ) : null}
      {q.length >= 2 ? (
        <Section title={stations.length ? "Stations" : "No stations found"}>
          {stations.length ? (
            <StationGrid stations={stations} label="Search results" />
          ) : (
            <Notice title={`Nothing on air called “${q}”`}>
              Check the spelling, try a shorter name, or <Link to="/top" className="underline">browse the top stations</Link>.
            </Notice>
          )}
          {page > 1 || hasNext ? (
            <nav aria-label="Pages" className="mt-8 flex justify-between">
              {page > 1 ? (
                <Link to={pageHref(page - 1)} className="caps rounded-full border-2 border-line px-5 py-2.5 hover:bg-paper-2">
                  Previous
                </Link>
              ) : (
                <span />
              )}
              {hasNext ? (
                <Link to={pageHref(page + 1)} className="caps rounded-full border-2 border-line px-5 py-2.5 hover:bg-paper-2">
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </Section>
      ) : null}
    </Container>
  );
}
