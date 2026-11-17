// Loader helpers shared by the list pages.
import { data } from "react-router";
import { PER_PAGE, parsePage, parseSort, toCard } from "./lists";
import { DirectoryUnavailable, searchStations, type StationQuery } from "./radio.server";

/** Turns "the station directory did not answer" into a 503 page instead of a crash. */
export async function guard<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof DirectoryUnavailable) {
      console.error("directory unavailable", String(error));
      throw data("The station directory is not answering", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
    }
    throw error;
  }
}

export function notFound(): never {
  throw data("Not found", { status: 404 });
}

/** One page of a station list, sorted and paged by the ?sort= and ?page= of the address. */
export async function loadStationPage(request: Request, query: Omit<StationQuery, "order" | "limit" | "offset">) {
  const url = new URL(request.url);
  const sort = parseSort(url.searchParams.get("sort"));
  const page = parsePage(url.searchParams.get("page"));
  if (page === 0) notFound();
  const stations = await guard(() => searchStations({ ...query, order: sort.order, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE }));
  if (page > 1 && stations.length === 0) notFound();
  return {
    sort: sort.key,
    page,
    hasNext: stations.length > PER_PAGE,
    stations: stations.slice(0, PER_PAGE),
    cards: stations.slice(0, PER_PAGE).map(toCard),
  };
}

/** How many of a country's stations the home page lists under the dial. */
export const TUNED_COUNT = 24;

/** The stations listed under the home page dial for one country: its most listened to today. */
export async function tunedStations(countrycode: string) {
  const stations = await searchStations({ countrycode, order: "clickcount", limit: TUNED_COUNT });
  return stations.map(toCard);
}

/** Cache-Control for a page: errors are never cached. */
export function cacheFor(value: string) {
  return ({ errorHeaders }: { errorHeaders?: Headers }) => (errorHeaders ? { "Cache-Control": "no-store" } : { "Cache-Control": value });
}
