// The frame around every page: header, footer and the player's place. The Worker sends it with each direct
// visit; the static build (scripts/build-static.mjs) writes it once as the shell for hosts without a Worker.
import { cx, html, jsonScript, type Html } from "./html.ts";
import { icon, iconSprite, logoMark } from "./icons.ts";
import { headTags, type Seo } from "./seo.ts";
import type { SavedStation } from "./types.ts";
import { searchBox } from "./ui.ts";

export const NAV = [
  { to: "/countries", label: "Countries" },
  { to: "/genres", label: "Genres" },
  { to: "/languages", label: "Languages" },
  { to: "/favorites", label: "Favourites" },
];

const FOOTER_LINKS = [
  { to: "/countries", label: "All countries" },
  { to: "/genres", label: "All genres" },
  { to: "/languages", label: "All languages" },
  { to: "/favorites", label: "Your favourites" },
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
];

const POPULAR = [
  { to: "/country/united-states", label: "US radio" },
  { to: "/country/united-kingdom", label: "UK radio" },
  { to: "/country/india", label: "Indian radio" },
  { to: "/country/germany", label: "German radio" },
  { to: "/genre/jazz", label: "Jazz radio" },
  { to: "/genre/news", label: "News radio" },
  { to: "/genre/classical", label: "Classical radio" },
  { to: "/genre/pop", label: "Pop radio" },
];

const SECTION_OF: Record<string, string> = { "/countries": "/country/", "/genres": "/genre/", "/languages": "/language/" };

/** Whether a menu entry is the current section ("/genre/jazz" is under Genres). */
export function navActive(to: string, pathname: string): boolean {
  const section = SECTION_OF[to];
  return pathname === to || (section !== undefined && pathname.startsWith(section));
}

function header(pathname: string): Html {
  const onHome = pathname === "/";
  const link = (item: (typeof NAV)[number], extra = "") =>
    html`<a href="${item.to}" data-nav="${item.to}" class="${cx("nav-link caps rounded-full px-3 py-2", extra)}"${
      navActive(item.to, pathname) ? html` aria-current="page"` : ""
    }>${item.label}${item.to === "/favorites" ? html`<span class="num ml-1.5 text-[0.7rem]" data-fav-count hidden></span>` : ""}</a>`;
  return html`<header class="border-b border-line">
<a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">Skip to content</a>
<div class="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
<a href="/" class="flex flex-none items-center gap-2.5" aria-label="LiveRadio home">${logoMark(34)}<span class="display text-[1.55rem] tracking-tight">LiveRadio</span></a>
<nav aria-label="Main" class="ml-4 hidden items-center gap-1 md:flex">${NAV.map((item) => link(item))}</nav>
<div class="ml-auto hidden w-full max-w-xs lg:block" data-header-search${onHome ? html` hidden` : ""}>${searchBox()}</div>
<button type="button" data-menu class="ml-auto grid h-11 w-11 cursor-pointer place-items-center rounded-full md:hidden" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu"><span class="menu-open">${icon(
    "menu",
    22,
  )}</span><span class="menu-close">${icon("close", 22)}</span></button>
</div>
<nav id="mobile-nav" aria-label="Main" class="border-t border-hair px-4 pt-3 pb-4 md:hidden" hidden><div class="mb-3">${searchBox({ id: "q-menu" })}</div><ul class="grid grid-cols-2 gap-2">${NAV.map(
    (item) => html`<li>${link(item, "block text-center")}</li>`,
  )}</ul></nav>
</header>`;
}

function footer(): Html {
  const list = (items: { to: string; label: string }[]) =>
    html`<ul class="space-y-2">${items.map((l) => html`<li><a href="${l.to}" class="hover:underline">${l.label}</a></li>`)}</ul>`;
  return html`<footer class="mt-20 border-t border-line">
<div class="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
<div><div class="flex items-center gap-2.5">${logoMark(30)}<span class="display text-2xl">LiveRadio</span></div><p class="mt-3 max-w-sm text-ink-2">Live radio from every country, free in your browser. No sign-up and no app. Your favourites stay on your own device.</p></div>
<nav aria-label="Site"><h2 class="caps mb-3 text-muted">Explore</h2>${list(FOOTER_LINKS)}</nav>
<nav aria-label="Popular"><h2 class="caps mb-3 text-muted">Popular</h2>${list(POPULAR)}</nav>
</div>
<div class="border-t border-hair"><p class="caps mx-auto max-w-[1400px] px-4 py-4 text-muted sm:px-6">Stations stream from their own servers. LiveRadio does not host or record audio.</p></div>
</footer>`;
}

export type Assets = { css: string[]; js: string; fonts: string[] };

/** What the browser script needs to take over the page (src/client/main.ts reads it). */
export type PageState = {
  /** "server": this HTML is the finished page. "shell": a host without a Worker; the browser builds the page. */
  rendered: "server" | "shell";
  /** When the Worker built this page (ms since 1970). Cloudflare may serve a cached copy; the browser refreshes an old one. */
  builtAt?: number;
  stations: SavedStation[];
  /** The visitor's country code from the connection (for the home page dial in later visits). */
  cc?: string;
  track?: { type: "search"; label: string; value: number };
  /** Set on error pages so the browser offers "try again". */
  error?: string;
};

export function documentHtml(input: { seo: Seo; body: Html; pathname: string; assets: Assets; state: PageState }): string {
  const { assets } = input;
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f3eee3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15130f" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
${headTags(input.seo)}
${assets.fonts.map((href) => html`<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`)}
${assets.css.map((href) => html`<link rel="stylesheet" href="${href}">`)}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<script type="module" src="${assets.js}"></script>
</head>
<body>
${iconSprite}
<div id="progress" aria-hidden="true"></div>
${header(input.pathname)}
<main id="main" tabindex="-1" class="focus:outline-none">${input.body}</main>
${footer()}
<div id="player-root"></div>
<p id="announcer" class="sr-only" aria-live="polite"></p>
<script type="application/json" id="lr-state">${jsonScript(input.state)}</script>
</body>
</html>`.value;
}
