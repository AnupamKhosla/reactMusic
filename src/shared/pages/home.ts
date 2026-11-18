import { html } from "../html.ts";
import { icon } from "../icons.ts";
import { toCard } from "../lists.ts";
import { formatCount, paths, slugify } from "../names.ts";
import { definePage, Redirect } from "../page.ts";
import { DirectoryUnavailable, getCountries, getGenres, getLanguages, searchStations } from "../radio.ts";
import { LIST_CACHE, SITE_URL } from "../seo.ts";
import type { CardStation, Country } from "../types.ts";
import { chips, container, moreLink, notice, searchBox, section, stationGrid } from "../ui.ts";

const DIAL_COUNTRIES = 48;
/** How many of a country's stations the home page lists under the dial. */
export const TUNED_COUNT = 24;
/** Width of one country on the dial, in rem (src/client/dial.ts reads the rendered width). */
const DIAL_ITEM_REM = 9;

/** The stations listed under the dial for one country: its most listened to today. */
export async function tunedStations(countrycode: string): Promise<CardStation[]> {
  const stations = await searchStations({ countrycode, order: "clickcount", limit: TUNED_COUNT });
  return stations.map(toCard);
}

/** The list under the dial (also drawn in the browser when the dial turns: src/client/dial.ts). */
export function tunedList(country: Pick<Country, "name" | "slug">, stations: CardStation[]) {
  return stations.length > 0
    ? stationGrid(stations, `Stations in ${country.name}`)
    : notice(`Nothing on air in ${country.name} right now`, "Turn the dial to another country.");
}

export function tunedFailed(country: Pick<Country, "name" | "slug">) {
  return notice(
    "These stations didn't load",
    html`<button type="button" data-retry-tuned class="cursor-pointer underline">Try again</button>, or <a href="${paths.country(country.slug)}" class="underline">open the ${country.name} page</a>.`,
  );
}

function dial(countries: Country[], tunedIndex: number) {
  return html`<section aria-label="Tune in by country" class="relative" data-dial>
<div class="relative overflow-hidden rounded-xl border-2 border-line bg-bar text-on-bar">
<div aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2"><div class="mx-auto h-0 w-0 border-x-[9px] border-t-[12px] border-x-transparent border-t-red"></div><div class="mx-auto h-full w-[3px] bg-red"></div></div>
<ul id="dial-list" aria-label="Countries" class="dial-scale no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto select-none pointer-fine:cursor-grab data-dragging:cursor-grabbing data-dragging:snap-none" style="padding-inline:calc(50% - ${DIAL_ITEM_REM / 2}rem)">${countries.map(
    (c, i) => html`<li class="dial-item flex-none snap-center" style="width:${DIAL_ITEM_REM}rem" data-slug="${c.slug}" data-code="${c.code}" data-name="${c.name}" data-count="${c.count}"${
      i === tunedIndex ? html` data-active` : ""
    }><a href="${paths.country(c.slug)}" draggable="false" tabindex="${i === tunedIndex ? 0 : -1}"${
      i === tunedIndex ? html` aria-current="true"` : ""
    } class="group block pt-[34px] pb-4 text-center outline-offset-[-4px] pointer-fine:cursor-[inherit]"><span class="block bg-bar px-2 py-1"><span aria-hidden="true" class="dial-freq num block text-[0.8rem]">${(
      87.5 +
      i * 0.5
    ).toFixed(1)}</span><span class="dial-code num mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[0.8rem] font-medium tracking-wider">${c.code}</span><span class="dial-name mt-1.5 block truncate font-semibold group-hover:underline">${c.name}</span><span class="caps block text-on-bar-muted"><span class="num">${formatCount(
      c.count,
    )}</span> stations</span></span></a></li>`,
  )}</ul>
<script>(function(){var u=document.getElementById("dial-list"),f=u&&u.firstElementChild;if(f)u.scrollLeft=${tunedIndex}*f.offsetWidth})()</script>
</div>
<div class="mt-3 flex items-center justify-between gap-3"><p class="caps text-ink-2">Drag or swipe the dial · pick a country</p><div class="flex gap-2"><button type="button" data-dial-step="-1" aria-label="Tune to the previous country" class="grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 border-line hover:bg-paper-2 disabled:cursor-default disabled:opacity-35">${icon(
    "arrowLeft",
    18,
  )}</button><button type="button" data-dial-step="1" aria-label="Tune to the next country" class="grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 border-line hover:bg-paper-2 disabled:cursor-default disabled:opacity-35">${icon(
    "arrowRight",
    18,
  )}</button></div></div>
</section>`;
}

export const homePage = definePage({
  pattern: "/",
  async load(ctx) {
    const url = ctx.url;
    // Addresses of the old one-page site: /?search=india&filter=bycountry&page=2
    const legacy = url.searchParams.get("search");
    if (legacy !== null) {
      const term = legacy.trim();
      if (!term) return new Redirect("/");
      if (url.searchParams.get("filter") === "bycountry") {
        const countries = await getCountries();
        const match = countries.find((c) => c.slug === slugify(term) || c.name.toLowerCase() === term.toLowerCase() || c.code === term.toUpperCase());
        if (match) return new Redirect(paths.country(match.slug));
      }
      return new Redirect(paths.search(term));
    }

    const countries = await getCountries();
    // The dial starts on the country in the address (?country=), else on the visitor's own country, else the largest.
    const picked = url.searchParams.get("country");
    const visitor = ctx.visitorCountry.toUpperCase();
    const tuned = (picked ? countries.find((c) => c.slug === picked) : undefined) ?? countries.find((c) => c.code === visitor) ?? countries[0];
    if (!tuned) throw new DirectoryUnavailable("the directory listed no countries");

    const [stations, popular, trending, genres, languages] = await Promise.all([
      tunedStations(tuned.code),
      searchStations({ order: "clickcount", limit: 12 }),
      searchStations({ order: "clicktrend", limit: 36 }),
      getGenres(),
      getLanguages(),
    ]);
    const dialCountries = countries.slice(0, DIAL_COUNTRIES);
    if (!dialCountries.some((c) => c.code === tuned.code)) dialCountries.push(tuned);
    const shown = new Set(popular.map((s) => s.id));
    return {
      tuned,
      stations,
      dial: dialCountries,
      popular: popular.map(toCard),
      trending: trending
        .filter((s) => !shown.has(s.id))
        .slice(0, 12)
        .map(toCard),
      totalStations: countries.reduce((sum, c) => sum + c.count, 0),
      totalCountries: countries.length,
      genres: genres.slice(0, 36).map((g) => ({ to: paths.genre(g.slug), label: g.label, count: g.count })),
      languages: languages.slice(0, 24).map((l) => ({ to: paths.language(l.slug), label: l.label, count: l.count })),
    };
  },
  render(d) {
    const total = formatCount(d.totalStations);
    const tunedIndex = Math.max(
      0,
      d.dial.findIndex((c) => c.code === d.tuned.code),
    );
    return {
      cache: LIST_CACHE,
      seo: {
        title: "LiveRadio – Listen to Live Radio Stations from Around the World",
        brand: false,
        description: `Listen to ${total} live radio stations from ${d.totalCountries} countries for free. Music, news, talk and sport, with no sign-up and no app.`,
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
      },
      body: container(html`<section class="grid gap-10 pt-10 pb-12 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:pt-16">
<div><p class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.95rem] font-medium text-ink-2"><span class="inline-flex items-center gap-2 text-ink"><span aria-hidden="true" class="h-2.5 w-2.5 rounded-full bg-red"></span>On air now</span><span aria-hidden="true">·</span><span><span class="num">${total}</span> stations</span><span aria-hidden="true">·</span><span><span class="num">${d.totalCountries}</span> countries</span></p>
<h1 class="display mt-4 text-[3.4rem] uppercase sm:text-[5rem] lg:text-[6.4rem]">Tune into<br>the world.</h1></div>
<div class="lg:pb-3"><p class="mb-5 max-w-md text-lg text-ink-2">Live radio from every corner of the map, free in your browser. No sign-up, no app. Press play and you are listening.</p>${searchBox({ size: "lg" })}</div>
</section>
${dial(d.dial, tunedIndex)}
${section(
  `Popular in ${d.tuned.name}`,
  html`<p class="sr-only" aria-live="polite" data-tuned-status></p><div data-tuned-list>${tunedList(d.tuned, d.stations)}</div>`,
  { id: "tuned", action: html`<span data-tuned-more>${moreLink(paths.country(d.tuned.slug), `All ${formatCount(d.tuned.count)} stations`)}</span>` },
)}
<div data-personal="recent"></div>
${section("Popular worldwide", stationGrid(d.popular, "Popular stations worldwide", 0), { id: "popular", action: moreLink("/top", "Top 100") })}
${d.trending.length > 0 ? section("Gaining listeners", stationGrid(d.trending, "Trending stations", 0), { id: "trending", action: moreLink("/top?sort=trending", "More") }) : ""}
${section("Find your sound", chips(d.genres, "Genres"), { id: "genres", action: moreLink("/genres", "All genres") })}
${section("By language", chips(d.languages, "Languages"), { id: "languages", action: moreLink("/languages", "All languages") })}
<section aria-label="About LiveRadio" class="mt-16 grid gap-6 border-t-2 border-line pt-8 md:grid-cols-3">${[
        ["Free and instant", "Every station plays straight from the broadcaster, in your browser. There is nothing to install and nothing to pay."],
        ["Every country", `${d.totalCountries} countries and ${total} stations: national broadcasters, city stations, college radio and online-only channels.`],
        ["Yours, privately", "Favourites and recently played stations are kept on your own device. No account, no email, no tracking cookies."],
      ].map(([title, text]) => html`<div><h2 class="display text-2xl">${title}</h2><p class="mt-2 text-ink-2">${text}</p></div>`)}</section>`),
    };
  },
});
