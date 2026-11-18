// The building blocks of every page, as plain functions that return HTML. The same functions run in the Worker
// and in the browser. Per-visitor state (which station plays, which are favourites) is not in this HTML: the
// browser script sets a few attributes after the page is shown (src/client/sync.ts), so a cached page is the same
// for everyone.
import { cx, html, type Html, type Part } from "./html.ts";
import { icon } from "./icons.ts";
import { listHref, SORTS, type SortKey } from "./lists.ts";
import { formatCount, initials, paths } from "./names.ts";
import type { CardStation, SavedStation, Station } from "./types.ts";

type AnyStation = Station | SavedStation | CardStation;

// ---- The stations a page shows, for the player ---------------------------------------------------------------
// Rendering is synchronous, so one collector at a time is safe even with many requests in one Worker.
let collected: Map<string, SavedStation> | null = null;

export function collectStations<T>(render: () => T): { result: T; stations: SavedStation[] } {
  collected = new Map();
  try {
    const result = render();
    return { result, stations: [...collected.values()] };
  } finally {
    collected = null;
  }
}

function remember(s: AnyStation) {
  if (!collected || collected.has(s.id)) return;
  collected.set(s.id, {
    id: s.id,
    name: s.name,
    stream: s.stream,
    hls: s.hls,
    favicon: s.favicon,
    countrycode: s.countrycode,
    country: s.country,
    tags: s.tags.slice(0, 3),
    codec: s.codec,
    bitrate: s.bitrate,
    homepage: s.homepage,
  });
}

// ---- Layout pieces ---------------------------------------------------------------------------------------------

export function container(children: Part, className = ""): Html {
  return html`<div class="${cx("mx-auto w-full max-w-[1400px] px-4 sm:px-6", className)}">${children}</div>`;
}

export function section(title: string, children: Part, options: { id?: string; action?: Part } = {}): Html {
  const headingId = options.id ? `${options.id}-title` : undefined;
  return html`<section ${headingId ? html`aria-labelledby="${headingId}"` : ""} class="mt-14"${options.id ? html` id="${options.id}"` : ""}>
<div class="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3"><h2 ${headingId ? html`id="${headingId}"` : ""} class="display text-[1.75rem] sm:text-[2.1rem]">${title}</h2>${options.action ?? ""}</div>
${children}</section>`;
}

export function moreLink(to: string, label: string): Html {
  return html`<a href="${to}" class="caps inline-flex flex-none items-center gap-1.5 font-medium text-red-ink hover:underline">${label} ${icon("arrowRight", 14)}</a>`;
}

export type Chip = { to: string; label: string; count?: number };

export function chips(items: Chip[], label: string): Html {
  if (items.length === 0) return html``;
  return html`<ul aria-label="${label}" class="flex flex-wrap gap-2">${items.map(
    (item) =>
      html`<li><a href="${item.to}" class="caps inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-ink hover:bg-ink hover:text-paper">${item.label}${
        item.count ? html`<span class="num text-[0.68rem] opacity-80">${formatCount(item.count)}</span>` : ""
      }</a></li>`,
  )}</ul>`;
}

export function breadcrumbs(items: { name: string; path?: string }[]): Html {
  return html`<nav aria-label="Breadcrumb" class="pt-6"><ol class="caps flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">${items.map(
    (item, i) =>
      html`<li class="flex items-center gap-2">${i > 0 ? html`<span aria-hidden="true">/</span>` : ""}${
        item.path && i < items.length - 1
          ? html`<a href="${item.path}" class="hover:text-ink hover:underline">${item.name}</a>`
          : html`<span aria-current="page" class="text-ink">${item.name}</span>`
      }</li>`,
  )}</ol></nav>`;
}

export function pageHeading(title: Part, options: { kicker?: Part; intro?: Part } = {}): Html {
  return html`<div class="pt-6 pb-2">${options.kicker ? html`<p class="caps mb-3 font-medium text-ink-2">${options.kicker}</p>` : ""}<h1 class="display text-[2.6rem] sm:text-[3.6rem] lg:text-[4.4rem]">${title}</h1>${
    options.intro ? html`<div class="mt-4 max-w-2xl text-lg text-ink-2">${options.intro}</div>` : ""
  }</div>`;
}

export function sortTabs(base: string, current: SortKey): Html {
  return html`<nav aria-label="Sort stations" class="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">${SORTS.map((s) => {
    const active = s.key === current;
    return html`<a href="${listHref(base, s.key, 1)}" data-keep-scroll ${active ? html`aria-current="page"` : ""} class="${cx(
      "caps flex-none rounded-full border px-3.5 py-2",
      active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-paper-2",
    )}">${s.label}</a>`;
  })}</nav>`;
}

export function pagination(hrefFor: (page: number) => string, page: number, hasNext: boolean): Html {
  if (page === 1 && !hasNext) return html``;
  const btn = "caps inline-flex h-11 items-center gap-2 rounded-full border-2 border-line px-5 hover:bg-paper-2";
  return html`<nav aria-label="Pages" class="mt-8 flex items-center justify-between gap-4">${
    page > 1 ? html`<a href="${hrefFor(page - 1)}" class="${btn}" rel="prev">${icon("arrowLeft", 16)} Previous</a>` : html`<span></span>`
  }<span class="caps text-muted">Page <span class="num">${page}</span></span>${
    hasNext ? html`<a href="${hrefFor(page + 1)}" class="${btn}" rel="next">Next ${icon("arrowRight", 16)}</a>` : html`<span></span>`
  }</nav>`;
}

export function notice(title: string, children?: Part): Html {
  return html`<div role="status" class="rounded-xl border-2 border-dashed border-line p-8 text-center"><p class="display text-2xl">${title}</p>${
    children ? html`<div class="mx-auto mt-2 max-w-md text-ink-2">${children}</div>` : ""
  }</div>`;
}

export function searchBox(options: { size?: "md" | "lg"; value?: string; autofocus?: boolean; id?: string } = {}): Html {
  const big = options.size === "lg";
  const id = options.id ?? (big ? "q-hero" : "q-top");
  return html`<form method="get" action="/search" role="search" class="w-full" data-search>
<label for="${id}" class="sr-only">Search stations by name</label>
<div class="${cx(
    "flex items-center gap-2 rounded-full border-2 border-line bg-paper pl-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]",
    big ? "h-16 pl-6" : "h-11",
  )}">${icon("search", big ? 22 : 18, "flex-none text-muted")}<input id="${id}" type="search" name="q" value="${options.value ?? ""}" ${
    options.autofocus ? html`autofocus` : ""
  } required minlength="2" maxlength="80" autocomplete="off" enterkeyhint="search" placeholder="${big ? "Search a station by name" : "Search stations"}" class="${cx(
    "min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted focus:outline-none",
    big ? "text-lg" : "text-[0.95rem]",
  )}"><button type="submit" aria-label="Search" class="${cx(
    "grid flex-none cursor-pointer place-items-center rounded-full bg-red text-on-red",
    big ? "mr-2 h-12 w-12" : "mr-1 h-8 w-8",
  )}">${icon("arrowRight", big ? 22 : 16)}</button></div></form>`;
}

// ---- Stations --------------------------------------------------------------------------------------------------

/** A station's logo in a printed frame. A missing or broken logo leaves the station's initials (src/client/logos.ts). */
export function stationLogo(name: string, src: string, size = 56, eager = false): Html {
  return html`<span class="logo-frame" style="width:${size}px;height:${size}px"><span class="num text-ink-2" style="font-size:${Math.max(11, Math.round(size / 3.4))}px" aria-hidden="true">${initials(name)}</span>${
    src
      ? html`<img src="${src}" alt="" width="${size}" height="${size}" loading="${eager ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer">`
      : ""
  }</span>`;
}

/** The round red play button. Its look follows the player (data-state, set in the browser). */
export function playButton(station: AnyStation, size: "md" | "lg" = "md"): Html {
  remember(station);
  const s = size === "lg" ? 26 : 18;
  // Three icons; CSS shows the one that matches the player (play, pause, or a spinner while tuning in).
  return html`<button type="button" data-play="${station.id}" aria-label="Play ${station.name}" aria-pressed="false" class="play-btn ${
    size === "lg" ? "play-lg" : "play-md"
  }">${icon("play", s, "i-play")}${icon("pause", s, "i-pause")}${icon("spinner", s, "i-busy")}</button>`;
}

export function favoriteButton(station: AnyStation, className = ""): Html {
  remember(station);
  return html`<button type="button" data-fav="${station.id}" aria-pressed="false" aria-label="Add ${station.name} to favourites" class="${cx(
    "fav-btn",
    className,
  )}">${icon("heart", 20)}</button>`;
}

// The whole card opens the station's own page (inside the site; Cmd/Ctrl-click or the middle button opens a new
// tab). The play and heart buttons sit above that link. The card's styles are in src/styles.css (.station-card).
export function stationCard(station: AnyStation, eager = false): Html {
  const listens = "clicks" in station && station.clicks > 0 ? station.clicks : 0;
  const meta = [station.countrycode, station.tags[0]].filter(Boolean).join(" · ");
  return html`<li data-card="${station.id}" class="station-card"><div class="card-top">${stationLogo(station.name, station.favicon, 56, eager)}${playButton(
    station,
  )}</div><div class="min-w-0"><h3 class="card-name"><a href="${paths.station(station)}" class="card-link">${station.name}</a></h3><p class="caps card-meta">${
    meta || " "
  }</p></div><div class="card-foot"><span class="caps text-muted"><span class="on-air"><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>On air</span><span class="listens">${
    listens ? html`<span class="num">${formatCount(listens)}</span> today` : " "
  }</span></span>${favoriteButton(station, "card-fav")}</div></li>`;
}

export const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

/** A grid of cards. data-queue: pressing play on one card queues the whole grid (next/previous in the player). */
export function stationGrid(stations: AnyStation[], label: string, eagerCount = 6): Html {
  if (stations.length === 0) return html``;
  return html`<ul aria-label="${label}" data-queue class="${GRID}">${stations.map((s, i) => stationCard(s, i < eagerCount))}</ul>`;
}

// ---- Loading placeholders --------------------------------------------------------------------------------------

function bar(className: string): Html {
  return html`<span class="${cx("skeleton block", !className.includes("rounded") && "rounded", className)}"></span>`;
}

function skeletonCard(): Html {
  return html`<li class="flex min-h-[11.5rem] flex-col gap-3 rounded-lg border border-hair p-3"><div class="flex items-start justify-between gap-2">${bar("h-14 w-14 rounded-md")}${bar(
    "h-11 w-11 rounded-full",
  )}</div>${bar("h-4 w-4/5")}${bar("h-3 w-2/5")}${bar("mt-auto h-3 w-1/3")}</li>`;
}

export function skeletonGrid(count = 12, label = "Loading stations"): Html {
  return html`<div role="status"><span class="sr-only">${label}…</span><ul aria-hidden="true" class="${GRID}">${Array.from({ length: count }, skeletonCard)}</ul></div>`;
}

/** Shown in place of a page that takes long to load. */
export function pageSkeleton(): Html {
  return container(
    html`<div role="status" class="pt-6"><span class="sr-only">Loading the page…</span><div aria-hidden="true">${bar("h-3 w-44")}${bar("mt-9 h-3 w-36")}${bar(
      "mt-4 h-11 w-3/4 max-w-xl sm:h-14",
    )}${bar("mt-6 h-4 w-full max-w-2xl")}${bar("mt-2.5 h-4 w-2/3 max-w-xl")}<div class="mt-8 mb-5 flex gap-2">${bar("h-9 w-28 rounded-full")}${bar(
      "h-9 w-24 rounded-full",
    )}${bar("h-9 w-28 rounded-full")}</div><ul class="${GRID}">${Array.from({ length: 12 }, skeletonCard)}</ul></div></div>`,
  );
}
