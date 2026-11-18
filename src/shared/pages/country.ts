import { html } from "../html.ts";
import { listHref, mostCommon, parsePage, parseSort } from "../lists.ts";
import { formatCount, nameSlug, paths } from "../names.ts";
import { definePage, NotFound, Redirect } from "../page.ts";
import { countryBySlug, getGenres, getLanguages } from "../radio.ts";
import { LIST_CACHE, listSeo } from "../seo.ts";
import { loadStationPage, stationListPage } from "./list.ts";

export const countryPage = definePage({
  pattern: "/country/:slug",
  async load(ctx) {
    const country = await countryBySlug(ctx.params.slug);
    if (!country) throw new NotFound();
    if (country.slug !== ctx.params.slug) {
      const sort = parseSort(ctx.url.searchParams.get("sort")).key;
      return new Redirect(listHref(paths.country(country.slug), sort, parsePage(ctx.url.searchParams.get("page")) || 1));
    }
    const [list, genres, languages] = await Promise.all([loadStationPage(ctx, { countrycode: country.code }), getGenres(), getLanguages()]);
    const genreByName = new Map(genres.map((g) => [g.name, g]));
    const languageByName = new Map(languages.map((l) => [l.name, l]));
    const topGenres = mostCommon(list.stations.flatMap((s) => s.tags), 30)
      .map((t) => genreByName.get(t))
      .filter((g) => g !== undefined)
      .slice(0, 16);
    const topLanguages = mostCommon(list.stations.flatMap((s) => s.languages), 12)
      .map((l) => languageByName.get(l))
      .filter((l) => l !== undefined)
      .slice(0, 8);
    return {
      country,
      list,
      genres: topGenres.map((g) => ({ to: paths.genre(g.slug), label: g.label })),
      languages: topLanguages.map((l) => ({ to: paths.language(nameSlug(l.name)), label: l.label })),
    };
  },
  render({ country, list, genres, languages }) {
    const base = paths.country(country.slug);
    const names = list.cards.slice(0, 3).map((s) => s.name);
    return {
      cache: LIST_CACHE,
      seo: listSeo({
        title: `${country.name} Radio Stations – Listen Live Online`,
        description: `Listen to ${formatCount(country.count)} live radio stations from ${country.name} online for free${
          names.length ? `: ${names.join(", ")} and more` : ""
        }. No sign-up, no app.`,
        base,
        sort: list.sort,
        page: list.page,
        crumbs: [
          { name: "Home", path: "/" },
          { name: "Countries", path: "/countries" },
          { name: country.name, path: base },
        ],
        stations: list.cards.map((s) => ({ name: s.name, path: paths.station(s) })),
      }),
      body: stationListPage({
        crumbs: [{ name: "Home", path: "/" }, { name: "Countries", path: "/countries" }, { name: country.name }],
        kicker: html`<span class="num">${country.code}</span> · <span class="num">${formatCount(country.count)}</span> stations`,
        title: `Radio in ${country.name}`,
        intro: html`<p>Live radio stations from ${country.name}, sorted by how many people are listening today. Press play to listen right here.</p>`,
        base,
        list,
        related: [
          { title: `Genres in ${country.name}`, items: genres },
          { title: `Languages on air in ${country.name}`, items: languages },
        ],
      }),
    };
  },
});
