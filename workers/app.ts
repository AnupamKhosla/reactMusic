import { createRequestHandler } from "react-router";
import { crawlerName, recordCrawl } from "../app/lib/analytics.server";

const requestHandler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);

// Pages kept at the edge so most visits cost no rendering (the free plan allows 10 ms of CPU per request).
// Only pages whose Cache-Control has s-maxage are stored; the dashboard and the APIs never are.
const NEVER_CACHE = /^\/(api\/|stats)/;
// Ad and campaign tags don't change the page: one cached copy serves them all.
const IGNORED_PARAMS = /^(utm_[a-z]+|fbclid|gclid|msclkid|ref)$/;

// Each build names its script files differently; the build's version is part of every cache key, so a new
// deploy never serves a cached page that points at the previous build's (now missing) scripts.
let buildVersion: string | null = null;
async function version(): Promise<string> {
  if (buildVersion) return buildVersion;
  const build = await import("virtual:react-router/server-build");
  buildVersion = String((build as { assets?: { version?: string } }).assets?.version ?? "0");
  return buildVersion;
}

async function cacheKey(url: URL): Promise<Request> {
  const key = new URL(url);
  for (const name of [...key.searchParams.keys()]) if (IGNORED_PARAMS.test(name)) key.searchParams.delete(name);
  key.searchParams.set("__build", await version());
  key.searchParams.sort();
  return new Request(key.toString(), { method: "GET" });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    const ua = request.headers.get("User-Agent") || "";
    const isPage = request.method === "GET" && !url.pathname.startsWith("/api/") && !url.pathname.endsWith(".data");
    if (isPage) {
      const bot = crawlerName(ua);
      if (bot) ctx.waitUntil(recordCrawl(env.DB, bot).catch(() => {}));
    }

    const cacheable =
      !import.meta.env.DEV && request.method === "GET" && !NEVER_CACHE.test(url.pathname) && !request.headers.has("Authorization");
    const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    if (cacheable && cache) {
      const key = await cacheKey(url);
      const hit = await cache.match(key);
      if (hit) {
        const response = new Response(hit.body, hit);
        response.headers.set("X-Edge-Cache", "HIT");
        return response;
      }
      const response = await requestHandler(request);
      const control = response.headers.get("Cache-Control") || "";
      if (response.status === 200 && /s-maxage=\d+/.test(control) && !response.headers.has("Set-Cookie")) {
        ctx.waitUntil(cache.put(key, response.clone()).catch(() => {}));
      }
      return response;
    }

    return requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
