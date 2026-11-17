import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { NearYou, RecentlyPlayed } from "~/components/Personal";
import { SearchBox } from "~/components/SearchBox";
import { StationGrid } from "~/components/StationCard";
import { TuningDial } from "~/components/TuningDial";
import { Chips, Container, MoreLink, Section } from "~/components/ui";
import { toCard } from "~/lib/lists";
import { formatCount, paths, slugify } from "~/lib/names";
import { cacheFor, guard } from "~/lib/pages.server";
import { getCountries, getGenres, getLanguages, searchStations } from "~/lib/radio.server";
import { LIST_CACHE, SITE_URL, seo } from "~/lib/seo";

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

  const [popular, trending, countries, genres, languages] = await guard(() =>
    Promise.all([
      searchStations({ order: "clickcount", limit: 24 }),
      searchStations({ order: "clicktrend", limit: 36 }),
      getCountries(),
      getGenres(),
      getLanguages(),
    ]),
  );
  const shown = new Set(popular.map((s) => s.id));
  return {
    popular: popular.map(toCard),
    trending: trending.filter((s) => !shown.has(s.id)).slice(0, 12).map(toCard),
    dial: countries.slice(0, 48),
    totalStations: countries.reduce((sum, c) => sum + c.count, 0),
    totalCountries: countries.length,
    genres: genres.slice(0, 36).map((g) => ({ to: paths.genre(g.slug), label: g.label, count: g.count })),
    languages: languages.slice(0, 24).map((l) => ({ to: paths.language(l.slug), label: l.label, count: l.count })),
  };
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

export default function Home({ loaderData }: Route.ComponentProps) {
  const { popular, trending, dial, totalStations, totalCountries, genres, languages } = loaderData;
  return (
    <Container>
      <section className="grid gap-10 pt-10 pb-12 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:pt-16">
        <div>
          <p className="caps text-red-ink">
            <span className="num">{formatCount(totalStations)}</span> stations · <span className="num">{totalCountries}</span> countries · On air now
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

      <TuningDial countries={dial} />

      <RecentlyPlayed />
      <NearYou />

      <Section id="popular" title="Popular right now" action={<MoreLink to="/top">Top 100</MoreLink>}>
        <StationGrid stations={popular} label="Popular stations" />
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
