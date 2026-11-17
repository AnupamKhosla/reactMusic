// The stations the home page lists under the dial, fetched when a visitor tunes to another country.
// Cached at the edge like the list pages, so turning the dial back and forth costs almost nothing.
import type { Route } from "./+types/api.country";
import { tunedStations } from "~/lib/pages.server";
import { countryBySlug } from "~/lib/radio.server";
import { LIST_CACHE } from "~/lib/seo";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const country = await countryBySlug(params.slug);
    if (!country) return Response.json({ stations: [] }, { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
    return Response.json({ stations: await tunedStations(country.code) }, { headers: { "Cache-Control": LIST_CACHE } });
  } catch {
    return Response.json({ stations: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
