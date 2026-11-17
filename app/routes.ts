import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Real addresses for every page (the old site kept everything in ?search=…&page=… on one page).
export default [
  index("routes/home.tsx"),
  route("top", "routes/top.tsx"),
  route("countries", "routes/countries.tsx"),
  route("country/:slug", "routes/country.tsx"),
  route("genres", "routes/genres.tsx"),
  route("genre/:slug", "routes/genre.tsx"),
  route("languages", "routes/languages.tsx"),
  route("language/:slug", "routes/language.tsx"),
  route("station/:slug", "routes/station.tsx"),
  route("search", "routes/search.tsx"),
  route("favorites", "routes/favorites.tsx"),
  route("about", "routes/about.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("stats", "routes/stats.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap-index.ts"),
  route("sitemaps/:file", "routes/sitemap.ts"),
  route("manifest.webmanifest", "routes/manifest.ts"),
  route("api/collect", "routes/api.collect.ts"),
  route("api/near", "routes/api.near.ts"),
] satisfies RouteConfig;
