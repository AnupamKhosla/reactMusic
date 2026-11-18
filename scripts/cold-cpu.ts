// What a page costs on a brand-new Worker copy, measured on this Mac with the same JavaScript engine (V8).
//
//   node scripts/cold-cpu.ts record <path>...   saves the directory's real answers for those pages (tmp/fixtures.json)
//   node scripts/cold-cpu.ts <path>             one page in a fresh process, network answered instantly from the
//                                               saved answers, so only CPU work is timed
//
// Steps timed: loading the code (what Cloudflare does when it starts a new copy), the first request (lists not yet
// in memory: every directory answer is parsed), the same request again, and the Worker's own extras (bot check).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FIXTURES = fileURLToPath(new URL("../tmp/fixtures.json", import.meta.url));
const [mode, ...rest] = process.argv.slice(2);
const realFetch = globalThis.fetch;
const keyOf = (input: RequestInfo | URL) => {
  const u = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  return u.pathname + u.search;
};

function cpu() {
  const c = process.cpuUsage();
  return (c.user + c.system) / 1000;
}

if (mode === "record") {
  const saved: Record<string, string> = existsSync(FIXTURES) ? JSON.parse(readFileSync(FIXTURES, "utf8")) : {};
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await realFetch(input, init);
    const text = await response.clone().text();
    if (response.ok) saved[keyOf(input)] = text;
    return response;
  }) as typeof fetch;
  const { resolve } = await import("../src/shared/router.ts");
  for (const path of rest) {
    const r = await resolve(new URL(path, "https://liveradio.space"), "IN");
    console.log(path, r.type, "status" in r ? r.status : "");
  }
  writeFileSync(FIXTURES, JSON.stringify(saved));
  console.log(`saved ${Object.keys(saved).length} answers, ${Math.round(JSON.stringify(saved).length / 1024)} KB`);
  process.exit(0);
}

const path = mode;
const saved: Record<string, string> = JSON.parse(readFileSync(FIXTURES, "utf8"));
let parsedBytes = 0;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const body = saved[keyOf(input)];
  if (body === undefined) return new Response("not recorded", { status: 404 });
  parsedBytes += body.length;
  return new Response(body, { headers: { "Content-Type": "application/json" } });
}) as typeof fetch;

const t0 = cpu();
const { resolve } = await import("../src/shared/router.ts");
const { documentHtml } = await import("../src/shared/layout.ts");
const { crawlerName } = await import("../src/worker/analytics.ts");
const loadMs = cpu() - t0;

const assets = { js: "/assets/main.js", css: ["/assets/main.css"], fonts: [] };
async function request() {
  const start = cpu();
  crawlerName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  const url = new URL(path, "https://liveradio.space");
  const r = await resolve(url, "IN");
  let size = 0;
  if (r.type === "page") {
    size = documentHtml({ seo: r.seo, body: r.body, pathname: url.pathname, assets, state: { rendered: "server", builtAt: Date.now(), stations: r.stations } }).length;
  }
  return { ms: cpu() - start, size, status: r.type === "page" ? r.status : r.status };
}

const first = await request();
const firstParsed = parsedBytes;
parsedBytes = 0;
const second = await request();
console.log(
  `${path}\n  load code ${loadMs.toFixed(1)} ms | first request ${first.ms.toFixed(1)} ms (status ${first.status}, read ${Math.round(firstParsed / 1024)} KB of directory answers, page ${Math.round(first.size / 1024)} KB) | same again ${second.ms.toFixed(1)} ms (read ${Math.round(parsedBytes / 1024)} KB)`,
);
