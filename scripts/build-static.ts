// The site for a host without a Worker (GitHub Pages, any plain file server): `npm run build:static`.
// Copies the browser build (dist/client) to dist/static and adds the empty frame of the site as index.html and
// 404.html. A plain host sends that frame for every address; the browser script sees `"rendered": "shell"`, asks
// the directory for the page's data itself and fills the page with the same templates the Worker uses (a skeleton
// shows only if that takes longer than half a second).
//
// Limits of plain hosting, compared with the Worker: crawlers that don't run JavaScript see an empty page, other
// addresses than / answer with status 404 (from 404.html) even though the page then shows, there's no visitor
// counting and no dashboard. The site must sit at the root of its domain (all links start with "/").
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { trusted } from "../src/shared/html.ts";
import { documentHtml, type Assets } from "../src/shared/layout.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const client = `${root}dist/client`;
const out = `${root}dist/static`;

type ManifestEntry = { file: string; css?: string[]; assets?: string[]; isEntry?: boolean };
const manifest = JSON.parse(readFileSync(`${client}/.vite/manifest.json`, "utf8")) as Record<string, ManifestEntry>;
const entry = Object.values(manifest).find((e) => e.isEntry);
if (!entry) throw new Error("No browser build found: run `vite build` first.");

const assets: Assets = {
  js: `/${entry.file}`,
  css: (entry.css ?? []).map((f) => `/${f}`),
  fonts: (entry.assets ?? []).filter((f) => /(instrument-sans|fraunces)-latin-wght-normal.*\.woff2$/.test(f)).map((f) => `/${f}`),
};

rmSync(out, { recursive: true, force: true });
cpSync(client, out, { recursive: true, filter: (src) => !src.includes("/.vite") && !src.endsWith(".assetsignore") });

const shell = documentHtml({
  // Replaced by the real page's tags as soon as the script has built it.
  seo: { title: "LiveRadio: live radio from every country", path: "/", brand: false },
  body: trusted(""),
  pathname: "/",
  assets,
  state: { rendered: "shell", stations: [] },
});
writeFileSync(`${out}/index.html`, shell);
writeFileSync(`${out}/404.html`, shell);
// GitHub Pages: serve files as they are (no Jekyll processing).
writeFileSync(`${out}/.nojekyll`, "");
console.log(`Plain-hosting build written to dist/static (${Math.round(shell.length / 1024)} KB frame).`);
