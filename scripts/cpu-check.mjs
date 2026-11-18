// Measures the live Worker's CPU time per request: starts `wrangler tail`, requests pages, then prints for every
// request its CPU ms, wall ms, whether the edge cache answered, and the outcome. The free plan allows about 10 ms
// of CPU per request (background work after the answer, ctx.waitUntil, counts too).
//
// Usage:
//   node scripts/cpu-check.mjs https://liveradio.space                 the standard page list, 3 rounds
//   node scripts/cpu-check.mjs https://liveradio.space --rounds 5 --fresh --ua googlebot /station/x /country/y
//     --fresh    adds ?cpu=<n> so every request misses the edge cache and is built anew
//     --ua       browser (default) | googlebot
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const base = args.shift();
if (!base) throw new Error("usage: node scripts/cpu-check.mjs <base url> [--rounds n] [--fresh] [--ua browser|googlebot] [paths...]");
let rounds = 3;
let fresh = false;
let uaName = "browser";
// Pause between requests: `wrangler tail` drops events that arrive in quick bursts.
let gap = 0;
let all = false;
const paths = [];
while (args.length) {
  const a = args.shift();
  if (a === "--rounds") rounds = Number(args.shift());
  else if (a === "--fresh") fresh = true;
  else if (a === "--ua") uaName = args.shift();
  else if (a === "--gap") gap = Number(args.shift());
  else if (a === "--all") all = true;
  else paths.push(a);
}
const UA = {
  browser: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
}[uaName];
// --all: one address of every kind of page and file the Worker answers.
const ALL = [
  "/",
  "/?country=germany",
  "/?country=brazil",
  "/top",
  "/top?page=2",
  "/countries",
  "/country/india",
  "/country/united-states",
  "/country/germany?page=2",
  "/country/germany?sort=trending",
  "/genres",
  "/genre/jazz",
  "/genre/news?sort=votes",
  "/languages",
  "/language/hindi",
  "/language/spanish?page=2",
  "/station/christmas-fm-non-stop-595687e1-9fa0-49d7-8cb7-d6ed63f6d8b3",
  "/station/moj-radio-e62438ca-ab93-4cc7-8f58-277126e6dbed",
  "/station/mohammed-rafi-db15bf87-980c-4388-a142-b0171a06ed46",
  "/station/mnm-961957e7-0601-11e8-ae97-52543be04c81",
  "/search?q=bbc",
  "/search?q=jazz",
  "/favorites",
  "/about",
  "/privacy",
  "/no-such-page",
  "/station/not-a-station",
  "/country/in",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemaps/main.xml",
  "/sitemaps/countries.xml",
  "/sitemaps/stations-1.xml",
];
const PAGES = all
  ? ALL
  : paths.length
  ? paths
  : [
      "/",
      "/?country=germany",
      "/top",
      "/countries",
      "/country/india",
      "/genres",
      "/genre/jazz",
      "/languages",
      "/station/christmas-fm-non-stop-595687e1-9fa0-49d7-8cb7-d6ed63f6d8b3",
      "/search?q=bbc",
      "/about",
      "/sitemap.xml",
    ];
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const tail = spawn("npx", ["wrangler", "tail", "liveradio", "--format", "json", "--config", path.join(root, "wrangler.jsonc")], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
let buffer = "";
const events = [];
tail.stdout.on("data", (chunk) => {
  buffer += chunk;
  // Events are pretty-printed JSON objects, one after another.
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  let consumed = 0;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          events.push(JSON.parse(buffer.slice(start, i + 1)));
        } catch {
          /* partial */
        }
        consumed = i + 1;
      }
    }
  }
  buffer = buffer.slice(consumed);
});

await new Promise((r) => setTimeout(r, 15000)); // let the tail connect
const mine = []; // { tag, path, round, edge, ms }
let n = 0;
const runTag = Date.now().toString(36);
for (let round = 1; round <= rounds; round++) {
  for (const p of PAGES) {
    n++;
    const tag = `${runTag}-${n}`;
    const u = new URL(base + p);
    // Untagged requests can't be told apart in the log, so every request carries a tag; with --fresh it also makes
    // the address new to the edge cache.
    u.searchParams.set(fresh ? "cpu" : "utm_source", fresh ? tag : `cpu-${tag}`);
    const t0 = performance.now();
    const res = await fetch(u, { headers: { "User-Agent": UA }, redirect: "manual" });
    await res.arrayBuffer();
    mine.push({ tag, path: p, round, status: res.status, edge: res.headers.get("x-edge-cache") ?? "BUILT", ms: Math.round(performance.now() - t0) });
    if (gap) await new Promise((r) => setTimeout(r, gap));
  }
}
await new Promise((r) => setTimeout(r, 25000)); // tail delivers events in batches, several seconds late
tail.kill();

const byTag = new Map();
for (const e of events) {
  const url = e.event?.request?.url;
  if (!url) continue;
  const q = new URL(url).searchParams;
  const v = q.get("cpu") ?? q.get("utm_source")?.replace(/^cpu-/, "");
  if (v) byTag.set(v, e);
}
console.log(`UA: ${uaName}${fresh ? ", every request built fresh" : ""}, ${rounds} round(s)\n`);
console.log("round  edge    status  wall ms  CPU ms  outcome  page");
const cpus = [];
for (const r of mine) {
  const e = byTag.get(r.tag);
  const cpu = e ? e.cpuTime : "?";
  if (e) cpus.push(e.cpuTime);
  // With --all the per-page lines below are enough.
  if (!all || (e && e.cpuTime > 10)) console.log(
    `${String(r.round).padEnd(6)} ${r.edge.padEnd(7)} ${String(r.status).padEnd(7)} ${String(e?.wallTime ?? r.ms).padStart(7)}  ${String(cpu).padStart(6)}  ${(e?.outcome ?? "not logged").padEnd(8)} ${r.path}`,
  );
}
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
function summary(label, list) {
  const s = [...list].sort((a, b) => a - b);
  if (!s.length) return `${label}: nothing logged`;
  const sum = s.reduce((a, b) => a + b, 0);
  return `${label}: ${s.length} logged | min ${s[0]} | median ${pct(s, 50)} | average ${(sum / s.length).toFixed(1)} | p95 ${pct(s, 95)} | p99 ${pct(s, 99)} | max ${s[s.length - 1]} | over 10 ms: ${s.filter((v) => v > 10).length}`;
}
console.log(`\nPer page (CPU ms of every logged request, in order):`);
for (const p of PAGES) {
  const list = mine.filter((r) => r.path === p && byTag.has(r.tag)).map((r) => byTag.get(r.tag).cpuTime);
  console.log(`  ${p.padEnd(72)} ${list.join(", ") || "none logged"}`);
}
console.log(`\n${summary("All requests", cpus)}`);
const later = mine.filter((r) => r.round > 1 && byTag.has(r.tag)).map((r) => byTag.get(r.tag).cpuTime);
console.log(summary("Without round 1 (Worker copies warmed up)", later));
const builtOnly = mine.filter((r) => r.edge !== "HIT" && byTag.has(r.tag)).map((r) => byTag.get(r.tag).cpuTime);
console.log(summary("Only requests that built a page (not served from cache)", builtOnly));
console.log(`Logged ${cpus.length} of ${mine.length} requests.`);
const over = [...byTag.values()].filter((e) => e.outcome !== "ok");
console.log(over.length ? `NOT OK: ${over.length}` : "every logged request ended ok");
