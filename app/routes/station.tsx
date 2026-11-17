import { useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/station";
import { CopyIcon, ExternalIcon, ShareIcon } from "~/components/Icons";
import { FavoriteButton, PlayButton, StationGrid } from "~/components/StationCard";
import { StationLogo } from "~/components/StationLogo";
import { Breadcrumbs, Chips, Container, Notice, Section } from "~/components/ui";
import { track } from "~/lib/analytics.client";
import { toCard } from "~/lib/lists";
import { formatCount, paths, stationIdFromSlug, titleCase } from "~/lib/names";
import { cacheFor, guard, notFound } from "~/lib/pages.server";
import { getCountries, getGenres, getLanguages, searchStations, stationById } from "~/lib/radio.server";
import { absolute, breadcrumbLd, LIST_CACHE, seo } from "~/lib/seo";

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = stationIdFromSlug(params.slug);
  if (!id) notFound();
  const station = await guard(() => stationById(id));
  if (!station) notFound();
  const canonical = paths.station(station);
  if (new URL(request.url).pathname !== canonical) throw redirect(canonical, 301);

  const [countries, genres, languages] = await guard(() => Promise.all([getCountries(), getGenres(), getLanguages()]));
  const country = countries.find((c) => c.code === station.countrycode) ?? null;
  const knownGenres = new Map(genres.map((g) => [g.name, g]));
  const knownLanguages = new Map(languages.map((l) => [l.name, l]));

  // Similar stations: same genre in the same country first, then the country's most popular.
  const tag = station.tags.find((t) => knownGenres.has(t));
  const pools = await Promise.all([
    tag && station.countrycode ? searchStations({ countrycode: station.countrycode, tag, limit: 13 }).catch(() => []) : Promise.resolve([]),
    station.countrycode ? searchStations({ countrycode: station.countrycode, limit: 13 }).catch(() => []) : Promise.resolve([]),
    tag ? searchStations({ tag, limit: 13 }).catch(() => []) : Promise.resolve([]),
  ]);
  const seen = new Set([station.id]);
  const similar = pools
    .flat()
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .slice(0, 12)
    .map(toCard);

  return {
    station,
    card: toCard(station),
    country: country ? { name: country.name, slug: country.slug } : null,
    genres: station.tags
      .map((t) => knownGenres.get(t))
      .filter((g) => g !== undefined)
      .map((g) => ({ to: paths.genre(g.slug), label: g.label })),
    languages: station.languages
      .map((l) => knownLanguages.get(l))
      .filter((l) => l !== undefined)
      .map((l) => ({ to: paths.language(l.slug), label: l.label })),
    similar,
  };
}

export const headers = cacheFor(LIST_CACHE);

function describe(s: { name: string; country: string; state: string; languages: string[]; tags: string[] }) {
  const place = [s.state && s.state.toLowerCase() !== s.country.toLowerCase() ? titleCase(s.state) : "", s.country].filter(Boolean).join(", ");
  const parts = [`${s.name} is a live radio station${place ? ` from ${place}` : ""}`];
  if (s.languages.length) parts.push(` broadcasting in ${s.languages.slice(0, 2).map(titleCase).join(" and ")}`);
  if (s.tags.length) parts.push(`${s.languages.length ? "," : ""} playing ${s.tags.slice(0, 3).join(", ")}`);
  return `${parts.join("")}. Listen live online for free, with no sign-up and no app.`;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { station, country } = loaderData;
  const path = paths.station(station);
  const crumbs = [{ name: "Home", path: "/" }];
  if (country) crumbs.push({ name: country.name, path: paths.country(country.slug) });
  crumbs.push({ name: station.name, path });
  return seo({
    title: `${station.name} – Listen Live${station.country ? ` (${station.country})` : ""}`,
    description: describe(station),
    path,
    jsonLd: [
      breadcrumbLd(crumbs),
      {
        "@context": "https://schema.org",
        "@type": "RadioStation",
        name: station.name,
        url: absolute(path),
        ...(station.favicon ? { logo: station.favicon, image: station.favicon } : {}),
        ...(station.homepage ? { sameAs: [station.homepage] } : {}),
        ...(station.countrycode
          ? { address: { "@type": "PostalAddress", addressCountry: station.countrycode, ...(station.state ? { addressRegion: titleCase(station.state) } : {}) } }
          : {}),
        ...(station.tags.length ? { keywords: station.tags.join(", ") } : {}),
      },
    ],
  });
}

function ShareButton({ name, id }: { name: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="caps inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-line px-4 hover:bg-paper-2"
      onClick={async () => {
        const url = window.location.href.split("?")[0];
        track("share", { station: id, station_name: name });
        if (navigator.share) {
          try {
            await navigator.share({ title: `${name} on LiveRadio`, url });
            return;
          } catch {
            /* cancelled: fall back to copying */
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      <ShareIcon size={16} /> {copied ? "Link copied" : "Share"}
    </button>
  );
}

function StreamAddress({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper-2 p-2 pl-3">
      <code className="num min-w-0 flex-1 truncate text-sm">{url}</code>
      <button
        type="button"
        aria-label={copied ? "Stream address copied" : "Copy the stream address"}
        className="caps inline-flex h-10 flex-none cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 hover:bg-paper"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked */
          }
        }}
      >
        <CopyIcon size={15} /> {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function StationPage({ loaderData }: Route.ComponentProps) {
  const { station, card, country, genres, languages, similar } = loaderData;
  const facts: [string, React.ReactNode][] = [];
  if (country) facts.push(["Country", <Link to={paths.country(country.slug)} className="underline">{country.name}</Link>]);
  if (station.state) facts.push(["Region", titleCase(station.state)]);
  if (languages.length) facts.push(["Language", languages.map((l) => l.label).join(", ")]);
  if (station.codec || station.bitrate) facts.push(["Sound", [station.codec, station.bitrate ? `${station.bitrate} kbps` : ""].filter(Boolean).join(" · ")]);
  facts.push(["Listens today", <span className="num">{formatCount(station.clicks)}</span>]);
  if (station.votes) facts.push(["Likes", <span className="num">{formatCount(station.votes)}</span>]);
  if (station.lastOk) facts.push(["Last seen on air", <span className="num">{station.lastOk.slice(0, 10)}</span>]);

  return (
    <Container>
      <Breadcrumbs
        items={[{ name: "Home", path: "/" }, ...(country ? [{ name: country.name, path: paths.country(country.slug) }] : []), { name: station.name }]}
      />
      <article className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <StationLogo name={station.name} src={station.favicon} size={128} eager />
            <div className="min-w-0">
              <p className="caps text-red-ink">{[station.country, station.tags[0]].filter(Boolean).join(" · ") || "Live radio"}</p>
              <h1 className="display mt-2 text-[2.4rem] break-words sm:text-[3.4rem]">{station.name}</h1>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PlayButton station={card} queue={[card, ...similar]} size="lg" />
            <span className="caps mr-2">Listen live</span>
            <FavoriteButton station={card} className="h-11 w-11 border-2 border-line" />
            <ShareButton name={station.name} id={station.id} />
            {station.homepage ? (
              <a
                href={station.homepage}
                target="_blank"
                rel="noopener nofollow"
                className="caps inline-flex h-11 items-center gap-2 rounded-full border-2 border-line px-4 hover:bg-paper-2"
              >
                Website <ExternalIcon size={15} />
              </a>
            ) : null}
          </div>
          {!station.ok ? (
            <div className="mt-6">
              <Notice title="This station may be off air">It did not answer the last check. It may be back soon; try playing it, or pick one of the stations below.</Notice>
            </div>
          ) : null}
          <p className="mt-8 max-w-2xl text-lg text-ink-2">{describe(station)}</p>
          {genres.length ? (
            <div className="mt-6">
              <Chips items={genres} label="Genres" />
            </div>
          ) : null}
        </div>
        <aside aria-label="About this station" className="self-start rounded-xl border-2 border-line p-5">
          <h2 className="caps mb-3 text-muted">Station facts</h2>
          <dl className="divide-y divide-hair">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <h2 className="caps mt-5 mb-2 text-muted">Listen in your own player</h2>
          <StreamAddress url={station.stream} />
        </aside>
      </article>
      {similar.length > 0 ? (
        <Section id="similar" title={`More like ${station.name}`}>
          <StationGrid stations={similar} label="Similar stations" eagerCount={0} />
        </Section>
      ) : null}
    </Container>
  );
}
