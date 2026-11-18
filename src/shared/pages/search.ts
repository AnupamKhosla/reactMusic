import { html } from "../html.ts";
import { PER_PAGE, parsePage, toCard } from "../lists.ts";
import { paths } from "../names.ts";
import { definePage, NotFound } from "../page.ts";
import { getCountries, getGenres, getLanguages, searchStations } from "../radio.ts";
import { SEARCH_CACHE } from "../seo.ts";
import { chips, container, notice, pageHeading, pagination, searchBox, section, stationGrid } from "../ui.ts";

export const searchPage = definePage({
  pattern: "/search",
  async load(ctx) {
    const q = (ctx.url.searchParams.get("q") ?? "").trim().slice(0, 80);
    const page = parsePage(ctx.url.searchParams.get("page"));
    if (page === 0) throw new NotFound();
    if (q.length < 2) return { q, page, hasNext: false, stations: [], matches: [] };
    const needle = q.toLowerCase();
    const [found, countries, genres, languages] = await Promise.all([
      searchStations({ name: q, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE }),
      getCountries(),
      getGenres(),
      getLanguages(),
    ]);
    const matches = [
      ...countries
        .filter((c) => c.name.toLowerCase().includes(needle))
        .slice(0, 4)
        .map((c) => ({ to: paths.country(c.slug), label: `${c.name} radio` })),
      ...genres
        .filter((g) => g.name.includes(needle))
        .slice(0, 4)
        .map((g) => ({ to: paths.genre(g.slug), label: `${g.label} radio` })),
      ...languages
        .filter((l) => l.name.includes(needle))
        .slice(0, 2)
        .map((l) => ({ to: paths.language(l.slug), label: `Radio in ${l.label}` })),
    ];
    return { q, page, hasNext: found.length > PER_PAGE, stations: found.slice(0, PER_PAGE).map(toCard), matches };
  },
  render({ q, page, hasNext, stations, matches }) {
    const pageHref = (p: number) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ""}`;
    return {
      cache: SEARCH_CACHE,
      seo: { title: q ? `“${q}” – Radio search` : "Search radio stations", path: "/search", noindex: true },
      track: q.length >= 2 && page === 1 ? { type: "search", label: q.toLowerCase(), value: stations.length } : undefined,
      body: container(html`${pageHeading(q ? `“${q}”` : "Find a station", { kicker: "Search" })}
<div class="mt-6 max-w-2xl">${searchBox({ value: q, autofocus: !q, id: "q-page" })}</div>
${matches.length > 0 ? html`<div class="mt-6">${chips(matches, "Matching countries, genres and languages")}</div>` : ""}
${
  q.length >= 2
    ? section(
        stations.length ? "Stations" : "No stations found",
        html`${
          stations.length
            ? stationGrid(stations, "Search results")
            : notice(
                `Nothing on air called “${q}”`,
                html`Check the spelling, try a shorter name, or <a href="/top" class="underline">browse the top stations</a>.`,
              )
        }${pagination(pageHref, page, hasNext)}`,
      )
    : ""
}`),
    };
  },
});
