// The most popular stations in the visitor's own country, for the home page's "Popular in …" row.
// The country comes from the connection (Cloudflare tells the Worker); nothing is stored.
import type { Route } from "./+types/api.near";
import { toCard } from "~/lib/lists";
import { getCountries, searchStations } from "~/lib/radio.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cf = (request as Request & { cf?: { country?: string } }).cf;
  const code = (cf?.country || new URL(request.url).searchParams.get("cc") || "").toUpperCase();
  const headers = { "Content-Type": "application/json", "Cache-Control": "private, max-age=600" };
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") return new Response(JSON.stringify({ country: null, stations: [] }), { headers });
  try {
    const [countries, stations] = await Promise.all([getCountries(), searchStations({ countrycode: code, limit: 12 })]);
    const country = countries.find((c) => c.code === code);
    if (!country) return new Response(JSON.stringify({ country: null, stations: [] }), { headers });
    return new Response(
      JSON.stringify({ country: { code: country.code, name: country.name, slug: country.slug }, stations: stations.slice(0, 12).map(toCard) }),
      { headers },
    );
  } catch {
    return new Response(JSON.stringify({ country: null, stations: [] }), { status: 200, headers: { ...headers, "Cache-Control": "no-store" } });
  }
}
