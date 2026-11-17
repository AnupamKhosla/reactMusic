import type { Route } from "./+types/top";
import { StationListPage } from "~/components/StationListPage";
import { paths } from "~/lib/names";
import { cacheFor, loadStationPage } from "~/lib/pages.server";
import { LIST_CACHE, listSeo } from "~/lib/seo";

export async function loader({ request }: Route.LoaderArgs) {
  const list = await loadStationPage(request, {});
  return { sort: list.sort, page: list.page, hasNext: list.hasNext && list.page < 3, stations: list.cards };
}

export const headers = cacheFor(LIST_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { stations, sort, page } = loaderData;
  return listSeo({
    title: "Top Radio Stations in the World – Listen Live",
    description: `The most listened-to live radio stations right now: ${stations
      .slice(0, 3)
      .map((s) => s.name)
      .join(", ")} and more. Free, no sign-up, no app.`,
    base: "/top",
    sort,
    page,
    crumbs: [
      { name: "Home", path: "/" },
      { name: "Top stations", path: "/top" },
    ],
    stations: stations.map((s) => ({ id: s.id, name: s.name, path: paths.station(s) })),
  });
}

export default function TopPage({ loaderData }: Route.ComponentProps) {
  const { sort, page, hasNext, stations } = loaderData;
  return (
    <StationListPage
      crumbs={[{ name: "Home", path: "/" }, { name: "Top stations" }]}
      kicker="Worldwide · updated through the day"
      title="Top stations"
      intro={<p>The stations the most people are listening to today, from every country.</p>}
      base="/top"
      sort={sort}
      page={page}
      hasNext={hasNext}
      stations={stations}
    />
  );
}
