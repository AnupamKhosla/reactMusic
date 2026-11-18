import { createRequestHandler } from "react-router";
import { crawlerName, recordCrawl } from "../app/lib/analytics.server";

const requestHandler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);

// Pages kept at the edge so most visits cost no rendering (the free plan allows 10 ms of CPU per request).
// Only pages whose Cache-Control has s-maxage are stored; the dashboard and the visit counter never are.
const NEVER_CACHE = /^\/(api\/collect|dashboard)/;
// Ad and campaign tags don't change the page: one cached copy serves them all.
const IGNORED_PARAMS = /^(utm_[a-z]+|fbclid|gclid|msclkid|ref)$/;

// Scanners probing for config files, backups and admin pages (18 Nov 2026: one sent ~4,300 a day). None of these
// exist here, so they get a plain 404 without rendering the site's 404 page, which costs real CPU time.
const PROBE =
  /(^|\/)\.(?!well-known\/)|\.(php\d?|env|ini|ya?ml|toml|sql|bak|old|orig|swp|log|cfg|conf|config|aspx?|jsp|cgi|csv|zip|gz|tgz|tar|rar|7z|json|map|sh|py|rb|pem|key)$|^\/(wp-|wordpress|phpmyadmin|cgi-bin|vendor|node_modules)/i;
// Scanner names seen in the logs; they never get a page.
const SCANNERS = /TLM-Audit-Scanner|CMS-Security-Auditor|zgrab|masscan|nuclei|sqlmap|nikto|Nmap/i;

function plain(status: number): Response {
  return new Response(status === 404 ? "Not found" : "Forbidden", {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" },
  });
}

// Every cache key carries the deployed version, so a new deploy never serves a page cached by the previous one:
// not its old scripts (the browser build's version) and not its old server output (Cloudflare's id for each
// deploy; the browser build's version alone stays the same when only server code changes).
let buildVersion: string | null = null;
async function version(env: Env): Promise<string> {
  if (buildVersion) return buildVersion;
  const build = await import("virtual:react-router/server-build");
  const assets = String((build as { assets?: { version?: string } }).assets?.version ?? "0");
  buildVersion = `${env.CF_VERSION_METADATA?.id ?? "local"}-${assets}`;
  return buildVersion;
}

async function cacheKey(url: URL, country: string, env: Env): Promise<Request> {
  const key = new URL(url);
  for (const name of [...key.searchParams.keys()]) if (IGNORED_PARAMS.test(name)) key.searchParams.delete(name);
  key.searchParams.set("__build", await version(env));
  // Without ?country= the home page (and its data for in-app visits) lists the visitor's own country's
  // stations: one cached copy per country.
  if ((url.pathname === "/" || url.pathname === "/_root.data") && !key.searchParams.has("country")) {
    key.searchParams.set("__cc", country);
  }
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
    if (SCANNERS.test(ua)) return plain(403);
    if (PROBE.test(url.pathname)) return plain(404);

    const bot = crawlerName(ua);
    // The visitor dashboard is for the owner only: crawlers, scripts without a browser name and anything else that
    // calls itself a bot are told it doesn't exist (robots.txt doesn't name it, so it isn't advertised either).
    if (url.pathname.startsWith("/dashboard") && (bot || !/^Mozilla\//.test(ua))) return plain(404);

    const isPage = request.method === "GET" && !url.pathname.startsWith("/api/") && !url.pathname.endsWith(".data");
    if (isPage && bot) ctx.waitUntil(recordCrawl(env.DB, bot).catch(() => {}));

    const cacheable =
      !import.meta.env.DEV && request.method === "GET" && !NEVER_CACHE.test(url.pathname) && !request.headers.has("Authorization");
    const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    if (cacheable && cache) {
      const key = await cacheKey(url, String(request.cf?.country ?? ""), env);
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
