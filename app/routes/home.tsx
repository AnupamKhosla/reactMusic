import { useEffect, useRef, useState } from "react";
import { Link, redirect, useSearchParams, type ShouldRevalidateFunctionArgs } from "react-router";
import type { Route } from "./+types/home";
import { RecentlyPlayed } from "~/components/Personal";
import { SearchBox } from "~/components/SearchBox";
import { SkeletonGrid } from "~/components/Skeleton";
import { StationGrid } from "~/components/StationCard";
import { TuningDial } from "~/components/TuningDial";
import { Chips, Container, MoreLink, Notice, Section } from "~/components/ui";
import { toCard } from "~/lib/lists";
import { formatCount, paths, slugify } from "~/lib/names";
import { cacheFor, guard, tunedStations } from "~/lib/pages.server";
import { getCountries, getGenres, getLanguages, searchStations } from "~/lib/radio.server";
import { LIST_CACHE, SITE_URL, seo } from "~/lib/seo";
import type { CardStation, Country } from "~/lib/types";

const DIAL_COUNTRIES = 48;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  // Addresses of the old one-page site: /?search=india&filter=bycountry&page=2
  const legacy = url.searchParams.get("search");
  if (legacy !== null) {
    const term = legacy.trim();
    if (!term) throw redirect("/", 301);
    if (url.searchParams.get("filter") === "bycountry") {
      const countries = await guard(getCountries);
      const match = countries.find((c) => c.slug === slugify(term) || c.name.toLowerCase() === term.toLowerCase() || c.code === term.toUpperCase());
      if (match) throw redirect(paths.country(match.slug), 301);
    }
    throw redirect(paths.search(term), 301);
  }

  const countries = await guard(getCountries);
  // The dial starts on the country in the address (?country=), else on the visitor's own country (Cloudflare
  // knows it from the connection; the edge keeps one copy of this page per country), else the largest.
  const picked = url.searchParams.get("country");
  const visitor = ((request as Request & { cf?: { country?: string } }).cf?.country ?? "").toUpperCase();
  const tuned =
    (picked ? countries.find((c) => c.slug === picked) : undefined) ?? countries.find((c) => c.code === visitor) ?? countries[0];
  if (!tuned) throw new Response("The station directory is empty", { status: 503 });

  const [stations, popular, trending, genres, languages] = await guard(() =>
    Promise.all([
      tunedStations(tuned.code),
      searchStations({ order: "clickcount", limit: 12 }),
      searchStations({ order: "clicktrend", limit: 36 }),
      getGenres(),
      getLanguages(),
    ]),
  );
  const dial = countries.slice(0, DIAL_COUNTRIES);
  if (!dial.some((c) => c.code === tuned.code)) dial.push(tuned);
  const shown = new Set(popular.map((s) => s.id));
  return {
    tuned: { country: tuned, stations },
    popular: popular.map(toCard),
    trending: trending.filter((s) => !shown.has(s.id)).slice(0, 12).map(toCard),
    dial,
    totalStations: countries.reduce((sum, c) => sum + c.count, 0),
    totalCountries: countries.length,
    genres: genres.slice(0, 36).map((g) => ({ to: paths.genre(g.slug), label: g.label, count: g.count })),
    languages: languages.slice(0, 24).map((l) => ({ to: paths.language(l.slug), label: l.label, count: l.count })),
  };
}

// Turning the dial only changes ?country= in the address: the page keeps its data and fetches just the
// tuned country's stations (below), instead of reloading everything.
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (currentUrl.pathname === "/" && nextUrl.pathname === "/") {
    const before = new URLSearchParams(currentUrl.search);
    const after = new URLSearchParams(nextUrl.search);
    before.delete("country");
    after.delete("country");
    if (before.toString() === after.toString()) return false;
  }
  return defaultShouldRevalidate;
}

export const headers = cacheFor(LIST_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  const stations = loaderData ? formatCount(loaderData.totalStations) : "Thousands of";
  const countries = loaderData?.totalCountries ?? 200;
  return seo({
    title: "LiveRadio – Listen to Live Radio Stations from Around the World",
    brand: false,
    description: `Listen to ${stations} live radio stations from ${countries} countries for free. Music, news, talk and sport, with no sign-up and no app.`,
    path: "/",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "LiveRadio",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });
}

/** The stations of the tuned country: from the page itself, or fetched when the dial turns (kept for re-visits). */
function useTunedStations(country: Country, initial: { country: Country; stations: CardStation[] }) {
  const cache = useRef(new Map<string, CardStation[]>());
  cache.current.set(initial.country.slug, initial.stations);
  const [, setVersion] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const slug = country.slug;

  useEffect(() => {
    if (cache.current.has(slug)) return;
    const controller = new AbortController();
    setFailed(null);
    fetch(`/api/country/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ stations: CardStation[] }>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body) => {
        cache.current.set(slug, body.stations);
        setVersion((v) => v + 1);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(slug);
      });
    return () => controller.abort();
  }, [slug]);

  return { stations: cache.current.get(slug) ?? null, failed: failed === slug };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { tuned: initial, popular, trending, dial, totalStations, totalCountries, genres, languages } = loaderData;
  const [params, setParams] = useSearchParams();
  const slug = params.get("country") ?? initial.country.slug;
  const country = dial.find((c) => c.slug === slug) ?? initial.country;
  const { stations, failed } = useTunedStations(country, initial);

  const onTune = (c: Country) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("country", c.slug);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  return (
    <Container>
      <section className="grid gap-10 pt-10 pb-12 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:pt-16">
        <div>
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.95rem] font-medium text-ink-2">
            <span className="inline-flex items-center gap-2 text-ink">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-red" />
              On air now
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <span className="num">{formatCount(totalStations)}</span> stations
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <span className="num">{totalCountries}</span> countries
            </span>
          </p>
          <h1 className="display mt-4 text-[3.4rem] uppercase sm:text-[5rem] lg:text-[6.4rem]">
            Tune into
            <br />
            the world.
          </h1>
        </div>
        <div className="lg:pb-3">
          <p className="mb-5 max-w-md text-lg text-ink-2">
            Live radio from every corner of the map, free in your browser. No sign-up, no app. Press play and you are listening.
          </p>
          <SearchBox size="lg" />
        </div>
      </section>

      <TuningDial countries={dial} tuned={country.slug} onTune={onTune} />

      <Section
        id="tuned"
        title={`Popular in ${country.name}`}
        action={<MoreLink to={paths.country(country.slug)}>All {formatCount(country.count)} stations</MoreLink>}
      >
        <p className="sr-only" aria-live="polite">
          {stations ? `Showing stations from ${country.name}` : failed ? "" : `Loading stations from ${country.name}`}
        </p>
        {failed ? (
          <Notice title="These stations didn't load">
            Please try again in a moment, or{" "}
            <Link to={paths.country(country.slug)} className="underline">
              open the {country.name} page
            </Link>
            .
          </Notice>
        ) : stations === null ? (
          <SkeletonGrid count={12} label={`Loading stations from ${country.name}`} />
        ) : stations.length > 0 ? (
          <StationGrid key={country.slug} stations={stations} label={`Stations in ${country.name}`} />
        ) : (
          <Notice title={`Nothing on air in ${country.name} right now`}>Turn the dial to another country.</Notice>
        )}
      </Section>

      <RecentlyPlayed />

      <Section id="popular" title="Popular worldwide" action={<MoreLink to="/top">Top 100</MoreLink>}>
        <StationGrid stations={popular} label="Popular stations worldwide" eagerCount={0} />
      </Section>

      {trending.length > 0 ? (
        <Section id="trending" title="Gaining listeners" action={<MoreLink to="/top?sort=trending">More</MoreLink>}>
          <StationGrid stations={trending} label="Trending stations" eagerCount={0} />
        </Section>
      ) : null}

      <Section id="genres" title="Find your sound" action={<MoreLink to="/genres">All genres</MoreLink>}>
        <Chips items={genres} label="Genres" />
      </Section>

      <Section id="languages" title="By language" action={<MoreLink to="/languages">All languages</MoreLink>}>
        <Chips items={languages} label="Languages" />
      </Section>

      <section aria-label="About LiveRadio" className="mt-16 grid gap-6 border-t-2 border-line pt-8 md:grid-cols-3">
        {[
          ["Free and instant", "Every station plays straight from the broadcaster, in your browser. There is nothing to install and nothing to pay."],
          ["Every country", `${totalCountries} countries and ${formatCount(totalStations)} stations: national broadcasters, city stations, college radio and online-only channels.`],
          ["Yours, privately", "Favourites and recently played stations are kept on your own device. No account, no email, no tracking cookies."],
        ].map(([title, text]) => (
          <div key={title}>
            <h2 className="display text-2xl">{title}</h2>
            <p className="mt-2 text-ink-2">{text}</p>
          </div>
        ))}
      </section>
    </Container>
  );
}
