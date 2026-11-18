import { html, type Part } from "../html.ts";
import { icon } from "../icons.ts";
import { toCard } from "../lists.ts";
import { formatCount, paths, stationIdFromSlug, titleCase } from "../names.ts";
import { definePage, NotFound, Redirect } from "../page.ts";
import { getCountries, getGenres, getLanguages, searchStations, stationById } from "../radio.ts";
import { absolute, breadcrumbLd, LIST_CACHE } from "../seo.ts";
import type { Station } from "../types.ts";
import { breadcrumbs, chips, container, favoriteButton, notice, playButton, section, stationGrid, stationLogo } from "../ui.ts";

function describe(s: Station): string {
  const place = [s.state && s.state.toLowerCase() !== s.country.toLowerCase() ? titleCase(s.state) : "", s.country].filter(Boolean).join(", ");
  const parts = [`${s.name} is a live radio station${place ? ` from ${place}` : ""}`];
  if (s.languages.length) parts.push(` broadcasting in ${s.languages.slice(0, 2).map(titleCase).join(" and ")}`);
  if (s.tags.length) parts.push(`${s.languages.length ? "," : ""} playing ${s.tags.slice(0, 3).join(", ")}`);
  return `${parts.join("")}. Listen live online for free, with no sign-up and no app.`;
}

export const stationPage = definePage({
  pattern: "/station/:slug",
  async load(ctx) {
    const id = stationIdFromSlug(ctx.params.slug);
    if (!id) throw new NotFound();
    const station = await stationById(id);
    if (!station) throw new NotFound();
    // Old or misspelt names in the address go to the station's one address.
    const canonical = paths.station(station);
    if (`/station/${ctx.params.slug}` !== canonical) return new Redirect(canonical);

    const [countries, genres, languages] = await Promise.all([getCountries(), getGenres(), getLanguages()]);
    const country = countries.find((c) => c.code === station.countrycode) ?? null;
    const knownGenres = new Map(genres.map((g) => [g.name, g]));
    const knownLanguages = new Map(languages.map((l) => [l.name, l]));

    // Similar stations: same genre in the same country first, then the country's most popular. A failed list
    // only leaves this part out; the station itself still shows.
    const tag = station.tags.find((t) => knownGenres.has(t));
    const none = Promise.resolve([] as Station[]);
    const pools = await Promise.all([
      tag && station.countrycode ? searchStations({ countrycode: station.countrycode, tag, limit: 13 }).catch(() => []) : none,
      station.countrycode ? searchStations({ countrycode: station.countrycode, limit: 13 }).catch(() => []) : none,
      tag ? searchStations({ tag, limit: 13 }).catch(() => []) : none,
    ]);
    const seen = new Set([station.id]);
    const similar = pools
      .flat()
      .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
      .slice(0, 12)
      .map(toCard);

    return {
      station,
      country: country ? { name: country.name, slug: country.slug } : null,
      genres: station.tags.flatMap((t) => {
        const g = knownGenres.get(t);
        return g ? [{ to: paths.genre(g.slug), label: g.label }] : [];
      }),
      languages: station.languages.flatMap((l) => {
        const found = knownLanguages.get(l);
        return found ? [{ to: paths.language(found.slug), label: found.label }] : [];
      }),
      similar,
    };
  },
  render({ station, country, genres, languages, similar }) {
    const path = paths.station(station);
    const crumbs = [{ name: "Home", path: "/" }];
    if (country) crumbs.push({ name: country.name, path: paths.country(country.slug) });
    crumbs.push({ name: station.name, path });

    const facts: [string, Part][] = [];
    if (country) facts.push(["Country", html`<a href="${paths.country(country.slug)}" class="underline">${country.name}</a>`]);
    if (station.state) facts.push(["Region", titleCase(station.state)]);
    if (languages.length) facts.push(["Language", languages.map((l) => l.label).join(", ")]);
    if (station.codec || station.bitrate) facts.push(["Sound", [station.codec, station.bitrate ? `${station.bitrate} kbps` : ""].filter(Boolean).join(" · ")]);
    facts.push(["Listens today", html`<span class="num">${formatCount(station.clicks)}</span>`]);
    if (station.votes) facts.push(["Likes", html`<span class="num">${formatCount(station.votes)}</span>`]);
    if (station.lastOk) facts.push(["Last seen on air", html`<span class="num">${station.lastOk.slice(0, 10)}</span>`]);

    const card = toCard(station);
    const button = "caps inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-line px-4 hover:bg-paper-2";

    return {
      cache: LIST_CACHE,
      seo: {
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
      },
      body: container(html`${breadcrumbs([{ name: "Home", path: "/" }, ...(country ? [{ name: country.name, path: paths.country(country.slug) }] : []), { name: station.name }])}
<article class="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]" data-queue>
<div data-card="${station.id}" class="station-hero">
<div class="flex flex-col gap-6 sm:flex-row sm:items-center">${stationLogo(station.name, station.favicon, 128, true)}<div class="min-w-0"><p class="caps text-red-ink">${
        [station.country, station.tags[0]].filter(Boolean).join(" · ") || "Live radio"
      }</p><h1 class="display mt-2 text-[2.4rem] break-words sm:text-[3.4rem]">${station.name}</h1></div></div>
<div class="mt-8 flex flex-wrap items-center gap-3">${playButton(card, "lg")}<span class="caps mr-2">Listen live</span>${favoriteButton(card, "h-11 w-11 border-2 border-line")}<button type="button" data-share="${station.id}" data-share-name="${station.name}" class="${button}">${icon("share", 16)} <span data-share-label>Share</span></button>${
        station.homepage
          ? html`<a href="${station.homepage}" target="_blank" rel="noopener nofollow" class="caps inline-flex h-11 items-center gap-2 rounded-full border-2 border-line px-4 hover:bg-paper-2">Website ${icon("external", 15)}</a>`
          : ""
      }</div>
${
  station.ok
    ? ""
    : html`<div class="mt-6">${notice("This station may be off air", "It did not answer the last check. It may be back soon; try playing it, or pick one of the stations below.")}</div>`
}
<p class="mt-8 max-w-2xl text-lg text-ink-2">${describe(station)}</p>
${genres.length ? html`<div class="mt-6">${chips(genres, "Genres")}</div>` : ""}
</div>
<aside aria-label="About this station" class="self-start rounded-xl border-2 border-line p-5"><h2 class="caps mb-3 text-muted">Station facts</h2><dl class="divide-y divide-hair">${facts.map(
        ([label, value]) => html`<div class="flex justify-between gap-4 py-2.5"><dt class="text-muted">${label}</dt><dd class="text-right font-medium">${value}</dd></div>`,
      )}</dl><h2 class="caps mt-5 mb-2 text-muted">Listen in your own player</h2><div class="flex items-center gap-2 rounded-lg border border-line bg-paper-2 p-2 pl-3"><code class="num min-w-0 flex-1 truncate text-sm">${station.stream}</code><button type="button" data-copy="${station.stream}" aria-label="Copy the stream address" class="caps inline-flex h-10 flex-none cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 hover:bg-paper">${icon(
        "copy",
        15,
      )} <span data-copy-label>Copy</span></button></div></aside>
${similar.length > 0 ? html`<div class="lg:col-span-2">${section(`More like ${station.name}`, stationGrid(similar, "Similar stations", 0), { id: "similar" })}</div>` : ""}
</article>`),
    };
  },
});
