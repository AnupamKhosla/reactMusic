import { html } from "../html.ts";
import { paths } from "../names.ts";
import { definePage } from "../page.ts";
import { LIST_CACHE, listSeo } from "../seo.ts";
import { loadStationPage, stationListPage } from "./list.ts";

export const topPage = definePage({
  pattern: "/top",
  async load(ctx) {
    const list = await loadStationPage(ctx, {});
    // The top list stops after three pages (144 stations).
    return { list: { ...list, hasNext: list.hasNext && list.page < 3 } };
  },
  render({ list }) {
    return {
      cache: LIST_CACHE,
      seo: listSeo({
        title: "Top Radio Stations in the World – Listen Live",
        description: `The most listened-to live radio stations right now: ${list.cards
          .slice(0, 3)
          .map((s) => s.name)
          .join(", ")} and more. Free, no sign-up, no app.`,
        base: "/top",
        sort: list.sort,
        page: list.page,
        crumbs: [
          { name: "Home", path: "/" },
          { name: "Top stations", path: "/top" },
        ],
        stations: list.cards.map((s) => ({ name: s.name, path: paths.station(s) })),
      }),
      body: stationListPage({
        crumbs: [{ name: "Home", path: "/" }, { name: "Top stations" }],
        kicker: "Worldwide · updated through the day",
        title: "Top stations",
        intro: html`<p>The stations the most people are listening to today, from every country.</p>`,
        base: "/top",
        list,
      }),
    };
  },
});
