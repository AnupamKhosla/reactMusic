// How much CPU a page costs to build. Loads each page's real data from the directory once (waiting on the network
// costs no CPU on Workers), then times building the finished HTML many times, the way the Worker does it.
// Run: node scripts/bench.ts            (Node 24+ runs TypeScript directly)
//
// The Mac's CPU is faster than a Cloudflare server's, so live numbers are higher; scripts/cpu-check.mjs measures
// the deployed Worker.
import { documentHtml } from "../src/shared/layout.ts";
import { matchPage } from "../src/shared/router.ts";
import { Redirect, type PageContext } from "../src/shared/page.ts";
import { toStation, topStations } from "../src/shared/radio.ts";
import { paths } from "../src/shared/names.ts";
import { collectStations } from "../src/shared/ui.ts";

const RUNS = 300;
const assets = { css: ["/assets/app.css"], js: "/assets/app.js", fonts: ["/assets/a.woff2", "/assets/b.woff2"] };

function stats(times: number[]) {
  const sorted = [...times].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { median: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] };
}

const ms = (n: number) => `${n.toFixed(3)} ms`;

const top = await topStations(1);
const station = top[0];
const addresses = ["/", "/top", "/countries", "/genres", "/languages", "/country/india", "/genre/jazz", "/language/spanish", "/search?q=bbc", paths.station(station)];

console.log(`Building each page ${RUNS} times on this Mac (data loaded once beforehand)\n`);
console.log("page".padEnd(52), "first build".padStart(12), "median".padStart(11), "p95".padStart(11), "HTML size".padStart(11));

for (const address of addresses) {
  const url = new URL(address, "https://liveradio.space");
  const found = matchPage(url.pathname);
  if (!found) throw new Error(`no page for ${address}`);
  const ctx: PageContext = { url, params: found.params, visitorCountry: "IN" };
  const data = await found.page.load(ctx);
  if (data instanceof Redirect) throw new Error(`${address} redirects to ${data.to}`);

  const build = () => {
    const { result, stations } = collectStations(() => found.page.render(data, ctx));
    return documentHtml({ seo: result.seo, body: result.body, pathname: url.pathname, assets, state: { rendered: "server", stations, cc: "IN" } });
  };

  let t = performance.now();
  const first = build();
  const firstMs = performance.now() - t;
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    t = performance.now();
    build();
    times.push(performance.now() - t);
  }
  const s = stats(times);
  console.log(
    address.slice(0, 52).padEnd(52),
    ms(firstMs).padStart(12),
    ms(s.median).padStart(11),
    ms(s.p95).padStart(11),
    `${(first.length / 1024).toFixed(0)} KB`.padStart(11),
  );
}

// Reading the directory's answer is CPU too (JSON parsing): time it for a 49-station list and the country list.
console.log("\nReading the directory's answers (JSON parse + clean-up)");
for (const [label, path] of [
  ["49 stations", "/json/stations/search?order=clickcount&reverse=true&hidebroken=true&limit=49&countrycode=IN"],
  ["all countries", "/json/countries?hidebroken=true"],
  ["600 genres", "/json/tags?hidebroken=true&order=stationcount&reverse=true&limit=600"],
] as const) {
  const text = await (await fetch(`https://de1.api.radio-browser.info${path}`)).text();
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now();
    const parsed = JSON.parse(text) as unknown[];
    if (label === "49 stations") (parsed as Parameters<typeof toStation>[0][]).map(toStation);
    times.push(performance.now() - t);
  }
  const s = stats(times);
  console.log(label.padEnd(52), "".padStart(12), ms(s.median).padStart(11), ms(s.p95).padStart(11), `${(text.length / 1024).toFixed(0)} KB`.padStart(11));
}
