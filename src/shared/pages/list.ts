// The pages that list stations (a country, a genre, a language, the top stations): sorted with ?sort=, paged with
// ?page=, and the same layout for all of them.
import { html, type Part } from "../html.ts";
import { listHref, PER_PAGE, parsePage, parseSort, toCard, type SortKey } from "../lists.ts";
import { NotFound, type PageContext } from "../page.ts";
import { searchStations, type StationQuery } from "../radio.ts";
import type { CardStation, Station } from "../types.ts";
import { breadcrumbs, chips, container, notice, pageHeading, pagination, section, sortTabs, stationGrid, type Chip } from "../ui.ts";

export type StationPage = { sort: SortKey; page: number; hasNext: boolean; stations: Station[]; cards: CardStation[] };

/** One page of a station list, sorted and paged by the ?sort= and ?page= of the address. */
export async function loadStationPage(ctx: PageContext, query: Omit<StationQuery, "order" | "limit" | "offset">): Promise<StationPage> {
  const sort = parseSort(ctx.url.searchParams.get("sort"));
  const page = parsePage(ctx.url.searchParams.get("page"));
  if (page === 0) throw new NotFound();
  const stations = await searchStations({ ...query, order: sort.order, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE });
  if (page > 1 && stations.length === 0) throw new NotFound();
  const shown = stations.slice(0, PER_PAGE);
  return { sort: sort.key, page, hasNext: stations.length > PER_PAGE, stations: shown, cards: shown.map(toCard) };
}

export function stationListPage(input: {
  crumbs: { name: string; path?: string }[];
  kicker?: Part;
  title: string;
  intro?: Part;
  base: string;
  list: { sort: SortKey; page: number; hasNext: boolean; cards: CardStation[] };
  related?: { title: string; items: Chip[] }[];
}) {
  const { list } = input;
  return container(html`${breadcrumbs(input.crumbs)}${pageHeading(input.title, { kicker: input.kicker, intro: input.intro })}
<div class="mt-8 mb-5">${sortTabs(input.base, list.sort)}</div>
${list.cards.length > 0 ? stationGrid(list.cards, "Stations") : notice("No stations here right now", "Every station on this list is off air at the moment. Try another one.")}
${pagination((p) => listHref(input.base, list.sort, p), list.page, list.hasNext)}
${(input.related ?? []).filter((r) => r.items.length > 0).map((r) => section(r.title, chips(r.items, r.title)))}`);
}
