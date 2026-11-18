import { html } from "../html.ts";
import { mostCommon } from "../lists.ts";
import { formatCount, paths } from "../names.ts";
import { definePage, NotFound } from "../page.ts";
import { getCountries, getGenres, languageBySlug } from "../radio.ts";
import { LIST_CACHE, listSeo } from "../seo.ts";
import { loadStationPage, stationListPage } from "./list.ts";

export const languagePage = definePage({
  pattern: "/language/:slug",
  async load(ctx) {
    const language = await languageBySlug(ctx.params.slug);
    if (!language) throw new NotFound();
    const [list, countries, genres] = await Promise.all([loadStationPage(ctx, { language: language.name }), getCountries(), getGenres()]);
    const byCode = new Map(countries.map((c) => [c.code, c]));
    const known = new Map(genres.map((g) => [g.name, g]));
    return {
      language,
      list,
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
  },
  render({ language, list, countries, genres }) {
    const base = paths.language(language.slug);
    const names = list.cards.slice(0, 3).map((s) => s.name);
    return {
      cache: LIST_CACHE,
      seo: listSeo({
        title: `${language.label} Radio Stations – Listen Live Online`,
        description: `Listen to ${formatCount(language.count)} live radio stations in ${language.label} for free${
          names.length ? `: ${names.join(", ")} and more` : ""
        }. No sign-up, no app.`,
        base,
        sort: list.sort,
        page: list.page,
        crumbs: [
          { name: "Home", path: "/" },
          { name: "Languages", path: "/languages" },
          { name: language.label, path: base },
        ],
        stations: list.cards.map((s) => ({ name: s.name, path: paths.station(s) })),
      }),
      body: stationListPage({
        crumbs: [{ name: "Home", path: "/" }, { name: "Languages", path: "/languages" }, { name: language.label }],
        kicker: html`Language · <span class="num">${formatCount(language.count)}</span> stations`,
        title: `Radio in ${language.label}`,
        intro: html`<p>Live stations broadcasting in ${language.label}, sorted by how many people are listening today.</p>`,
        base,
        list,
        related: [
          { title: `Where ${language.label} is on air`, items: countries },
          { title: "Genres", items: genres },
        ],
      }),
    };
  },
});
