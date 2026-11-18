import { html } from "../html.ts";
import { mostCommon } from "../lists.ts";
import { formatCount, paths } from "../names.ts";
import { definePage, NotFound } from "../page.ts";
import { genreBySlug, getCountries, getGenres } from "../radio.ts";
import { LIST_CACHE, listSeo } from "../seo.ts";
import { loadStationPage, stationListPage } from "./list.ts";

export const genrePage = definePage({
  pattern: "/genre/:slug",
  async load(ctx) {
    const genre = await genreBySlug(ctx.params.slug);
    if (!genre) throw new NotFound();
    const [list, countries, genres] = await Promise.all([loadStationPage(ctx, { tag: genre.name }), getCountries(), getGenres()]);
    // A genre nobody uses: a real 404 rather than an empty page for search engines to index.
    if (list.stations.length === 0 && genre.count === 0) throw new NotFound();
    const byCode = new Map(countries.map((c) => [c.code, c]));
    const known = new Map(genres.map((g) => [g.name, g]));
    return {
      genre,
      list,
      countries: mostCommon(list.stations.map((s) => s.countrycode), 12)
        .map((code) => byCode.get(code))
        .filter((c) => c !== undefined)
        .map((c) => ({ to: paths.country(c.slug), label: c.name })),
      related: mostCommon(
        list.stations.flatMap((s) => s.tags).filter((t) => t !== genre.name),
        24,
      )
        .map((t) => known.get(t))
        .filter((g) => g !== undefined)
        .slice(0, 14)
        .map((g) => ({ to: paths.genre(g.slug), label: g.label })),
    };
  },
  render({ genre, list, countries, related }) {
    const base = paths.genre(genre.slug);
    const names = list.cards.slice(0, 3).map((s) => s.name);
    const count = genre.count ? `${formatCount(genre.count)} ` : "";
    return {
      cache: LIST_CACHE,
      seo: listSeo({
        title: `${genre.label} Radio Stations – Listen Live Online`,
        description: `Listen to ${count}live ${genre.label.toLowerCase()} radio stations from around the world for free${
          names.length ? `: ${names.join(", ")} and more` : ""
        }. No sign-up, no app.`,
        base,
        sort: list.sort,
        page: list.page,
        crumbs: [
          { name: "Home", path: "/" },
          { name: "Genres", path: "/genres" },
          { name: genre.label, path: base },
        ],
        stations: list.cards.map((s) => ({ name: s.name, path: paths.station(s) })),
      }),
      body: stationListPage({
        crumbs: [{ name: "Home", path: "/" }, { name: "Genres", path: "/genres" }, { name: genre.label }],
        kicker: genre.count ? html`Genre · <span class="num">${formatCount(genre.count)}</span> stations` : "Genre",
        title: `${genre.label} radio`,
        intro: html`<p>Live ${genre.label.toLowerCase()} stations from around the world, sorted by how many people are listening today.</p>`,
        base,
        list,
        related: [
          { title: `Where ${genre.label.toLowerCase()} is on air`, items: countries },
          { title: "Related genres", items: related },
        ],
      }),
    };
  },
});
