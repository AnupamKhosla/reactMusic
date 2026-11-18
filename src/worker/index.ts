// The LiveRadio Worker. It runs only for requests that are not a file (scripts, styles, images and the manifest are
// static files Cloudflare serves for free without it). For a page it asks the directory for the data and joins the
// page's template strings into finished HTML: well under a millisecond of CPU, then cached at the edge, so most
// visits cost no work at all. No framework.
import manifest from "../../dist/client/.vite/manifest.json";
import { type Assets, documentHtml } from "../shared/layout.ts";
import { configureDirectory, DirectoryUnavailable } from "../shared/radio.ts";
import { errorPage, resolve, type Resolved } from "../shared/router.ts";
import { NO_STORE } from "../shared/seo.ts";
import { crawlerName, recordBatch, recordCrawl } from "./analytics.ts";
import { dashboard } from "./dashboard.ts";
import { robotsTxt, sitemapFile, sitemapXml } from "./sitemap.ts";

// The directory asks API users to name their app; Cloudflare keeps its answers a while, shared by every visitor.
configureDirectory({
  extras: (cacheTtl) => ({ headers: { "User-Agent": "LiveRadio/3 (+https://liveradio.space)" }, cf: { cacheTtl, cacheEverything: true } }) as RequestInit,
});

// ---- The browser script and stylesheet the build made (their names carry a content hash) -----------------------

type ManifestEntry = { file: string; css?: string[]; assets?: string[]; isEntry?: boolean };
const entry = Object.values(manifest as Record<string, ManifestEntry>).find((e) => e.isEntry);
if (!entry) throw new Error("dist/client/.vite/manifest.json has no entry: run `npm run build` first");
const ASSETS: Assets = {
  js: `/${entry.file}`,
  css: (entry.css ?? []).map((f) => `/${f}`),
  // The two text fonts every page uses at once (Latin); the others load when needed.
  fonts: (entry.assets ?? []).filter((f) => /(instrument-sans|fraunces)-latin-wght-normal.*\.woff2$/.test(f)).map((f) => `/${f}`),
};

// ---- Requests that never get a page -------------------------------------------------------------------------

// Scanners probing for config files, backups and admin pages (18 Nov 2026: one sent ~4,300 a day). None of these
// exist here, so they get a plain 404 at once.
const PROBE =
  /(^|\/)\.(?!well-known\/)|\.(php\d?|env|ini|ya?ml|toml|sql|bak|old|orig|swp|log|cfg|conf|config|aspx?|jsp|cgi|csv|zip|gz|tgz|tar|rar|7z|json|map|sh|py|rb|pem|key)$|^\/(wp-|wordpress|phpmyadmin|cgi-bin|vendor|node_modules)/i;
// Scanner names seen in the logs; they never get a page.
const SCANNERS = /TLM-Audit-Scanner|CMS-Security-Auditor|zgrab|masscan|nuclei|sqlmap|nikto|Nmap/i;

function plain(status: number, text = status === 404 ? "Not found" : "Forbidden", cache = "public, max-age=86400"): Response {
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": cache, "X-Robots-Tag": "noindex" } });
}

// ---- The edge cache ---------------------------------------------------------------------------------------

// Ad and campaign tags don't change the page: one cached copy serves them all.
const IGNORED_PARAMS = /^(utm_[a-z]+|fbclid|gclid|msclkid|ref)$/;

function cacheKey(url: URL, country: string, env: Env): Request {
  const key = new URL(url);
  for (const name of [...key.searchParams.keys()]) if (IGNORED_PARAMS.test(name)) key.searchParams.delete(name);
  // Each deploy starts with fresh pages (its scripts have new names; old pages would point at files that are gone).
  key.searchParams.set("__build", `${env.CF_VERSION_METADATA?.id ?? "local"}-${entry?.file}`);
  // Without ?country= the home page lists the visitor's own country's stations: one cached copy per country.
  if (url.pathname === "/" && !key.searchParams.has("country")) key.searchParams.set("__cc", country);
  key.searchParams.sort();
  return new Request(key.toString(), { method: "GET" });
}

const edgeCache = () => (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;

/** Addresses being rebuilt in the background right now (one rebuild at a time per address). */
const refreshing = new Set<string>();

/** Keeps a response in the edge cache: fresh for s-maxage, then served stale for up to stale-while-revalidate more. */
async function keep(cache: Cache, key: Request, response: Response): Promise<void> {
  const control = response.headers.get("Cache-Control") || "";
  const fresh = Number(/s-maxage=(\d+)/.exec(control)?.[1] ?? 0);
  if (response.status !== 200 || !fresh || response.headers.has("Set-Cookie")) return;
  const stale = Number(/stale-while-revalidate=(\d+)/.exec(control)?.[1] ?? 0);
  const stored = new Response(response.body, response);
  // The cache's own lifetime covers the stale period too; visitors still get the page's real Cache-Control.
  stored.headers.set("X-Page-Cache-Control", control);
  stored.headers.set("X-Built-At", String(Date.now()));
  stored.headers.set("Cache-Control", `public, s-maxage=${fresh + stale}`);
  await cache.put(key, stored);
}

/**
 * The edge cache, the way Next.js does incremental static regeneration: a cached page is always served at once; when
 * it is older than its s-maxage, the Worker builds it again after answering (ctx.waitUntil) and the next visitor gets
 * the fresh copy. A failed rebuild (the directory down) keeps the old copy until its stale time runs out.
 */
async function cached(request: Request, env: Env, ctx: ExecutionContext, make: () => Promise<Response>): Promise<Response> {
  const cache = edgeCache();
  // Not with `npm run dev` on the Mac: every reload should show the code just changed.
  if (!cache || request.method !== "GET" || (env as { LOCAL_DEV?: string }).LOCAL_DEV === "1") return make();
  const url = new URL(request.url);
  const key = cacheKey(url, String(request.cf?.country ?? ""), env);
  const hit = await cache.match(key);
  if (hit) {
    const control = hit.headers.get("X-Page-Cache-Control") || "";
    const fresh = Number(/s-maxage=(\d+)/.exec(control)?.[1] ?? 0);
    const age = (Date.now() - Number(hit.headers.get("X-Built-At") || 0)) / 1000;
    const response = new Response(hit.body, hit);
    response.headers.set("Cache-Control", control);
    response.headers.delete("X-Page-Cache-Control");
    response.headers.delete("X-Built-At");
    response.headers.set("X-Edge-Cache", age > fresh ? "STALE" : "HIT");
    if (age > fresh && !refreshing.has(key.url)) {
      refreshing.add(key.url);
      ctx.waitUntil(
        make()
          .then((next) => keep(cache, key, next))
          .catch((error) => console.error("background rebuild failed", key.url, String(error)))
          .finally(() => refreshing.delete(key.url)),
      );
    }
    return response;
  }
  const response = await make();
  ctx.waitUntil(keep(cache, key, response.clone()).catch(() => {}));
  return response;
}

// ---- Pages ---------------------------------------------------------------------------------------------

function htmlResponse(body: string, status: number, cache: string, extra: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...extra,
    },
  });
}

function pageResponse(resolved: Extract<Resolved, { type: "page" }>, url: URL, country: string): Response {
  const body = documentHtml({
    seo: resolved.seo,
    body: resolved.body,
    pathname: url.pathname,
    assets: ASSETS,
    state: { rendered: "server", builtAt: Date.now(), stations: resolved.stations, cc: country || undefined, track: resolved.track, error: resolved.error },
  });
  const extra: Record<string, string> = {};
  if (resolved.seo.noindex) extra["X-Robots-Tag"] = "noindex";
  if (resolved.error === "unavailable") extra["Retry-After"] = "60";
  return htmlResponse(body, resolved.status, resolved.error ? NO_STORE : resolved.cache, extra);
}

async function page(request: Request, url: URL): Promise<Response> {
  const country = String(request.cf?.country ?? "");
  const resolved = await resolve(url, country);
  if (resolved.type === "redirect") {
    return new Response(null, { status: resolved.status, headers: { Location: resolved.to, "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  }
  return pageResponse(resolved, url, country);
}

async function dashboardResponse(request: Request, url: URL, env: Env): Promise<Response> {
  const result = await dashboard(request, env.DB);
  const noStore = "private, no-store";
  if (result.type === "redirect") {
    result.headers.set("Cache-Control", noStore);
    return new Response(null, { status: 303, headers: result.headers });
  }
  const body = documentHtml({
    seo: { title: "Visitors", path: "/dashboard", noindex: true },
    body: result.body,
    pathname: url.pathname,
    assets: ASSETS,
    state: { rendered: "server", stations: [], error: "dashboard" },
  });
  return htmlResponse(body, result.status, noStore, { "X-Robots-Tag": "noindex, nofollow" });
}

// ---- The visit counter (src/client/analytics.ts sends the events) -----------------------------------------

const MAX_BODY = 16_000;

async function collect(request: Request, env: Env): Promise<Response> {
  const noStore = { "Cache-Control": "no-store" };
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  // Only pages of this site may send events.
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return new Response(null, { status: 403, headers: noStore });
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return new Response(null, { status: 413, headers: noStore });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return new Response(null, { status: 413, headers: noStore });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400, headers: noStore });
  }
  if (!body || typeof body !== "object") return new Response(null, { status: 400, headers: noStore });
  try {
    const result = await recordBatch(env.DB, request, body as Parameters<typeof recordBatch>[2]);
    return new Response(null, { status: result.ok ? 204 : 400, headers: noStore });
  } catch (error) {
    console.error("collect failed", String(error));
    return new Response(null, { status: 500, headers: noStore });
  }
}

// ---- Routing -------------------------------------------------------------------------------------------

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }

  const ua = request.headers.get("User-Agent") || "";
  if (SCANNERS.test(ua)) return plain(403);
  if (PROBE.test(url.pathname)) return plain(404);

  if (url.pathname === "/api/collect") return collect(request, env);
  if (url.pathname.startsWith("/api/")) return plain(404, "Not found", NO_STORE);

  const bot = crawlerName(ua);
  if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) {
    // The visitor dashboard is for the owner only: crawlers, scripts without a browser name and anything else that
    // calls itself a bot are told it doesn't exist (robots.txt doesn't name it, so it isn't advertised either).
    if (bot || !/^Mozilla\//.test(ua)) return plain(404);
    return dashboardResponse(request, url, env);
  }

  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });

  if (url.pathname === "/robots.txt") return robotsTxt();
  if (url.pathname === "/sitemap.xml") return sitemapXml();
  if (url.pathname.startsWith("/sitemaps/")) {
    return cached(request, env, ctx, async () => {
      try {
        return (await sitemapFile(url.pathname.slice("/sitemaps/".length))) ?? plain(404, "Not found", NO_STORE);
      } catch (error) {
        if (error instanceof DirectoryUnavailable) return plain(503, "The station directory is not answering", NO_STORE);
        throw error;
      }
    });
  }

  if (bot) ctx.waitUntil(recordCrawl(env.DB, bot).catch(() => {}));
  return cached(request, env, ctx, () => page(request, url));
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx);
    } catch (error) {
      // Nothing above should throw; if something does, the visitor still gets the site's own error page.
      console.error("request failed", request.url, error);
      const url = new URL(request.url);
      const failed = errorPage("error", url.pathname + url.search) as Extract<Resolved, { type: "page" }>;
      return pageResponse(failed, url, "");
    }
  },
} satisfies ExportedHandler<Env>;
