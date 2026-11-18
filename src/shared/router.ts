// Address -> page. Used by the Worker for direct visits and by the browser for pages opened inside the site, so
// both always show the same page for the same address.
import { html, type Html } from "./html.ts";
import { NotFound, Redirect, type PageContext, type PageDef, type Rendered } from "./page.ts";
import { countryPage } from "./pages/country.ts";
import { genrePage } from "./pages/genre.ts";
import { homePage } from "./pages/home.ts";
import { countriesPage, genresPage, languagesPage } from "./pages/hubs.ts";
import { aboutPage, favoritesPage, privacyPage } from "./pages/info.ts";
import { languagePage } from "./pages/language.ts";
import { searchPage } from "./pages/search.ts";
import { stationPage } from "./pages/station.ts";
import { topPage } from "./pages/top.ts";
import { DirectoryUnavailable } from "./radio.ts";
import { NO_STORE } from "./seo.ts";
import type { SavedStation } from "./types.ts";
import { collectStations, container, searchBox } from "./ui.ts";

const PAGES: PageDef<unknown>[] = [
  homePage,
  topPage,
  countriesPage,
  countryPage,
  genresPage,
  genrePage,
  languagesPage,
  languagePage,
  stationPage,
  searchPage,
  favoritesPage,
  aboutPage,
  privacyPage,
];

type Compiled = { page: PageDef<unknown>; re: RegExp; names: string[] };

const COMPILED: Compiled[] = PAGES.map((page) => {
  const names: string[] = [];
  const source = page.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:(\w+)/g, (_, name: string) => {
    names.push(name);
    return "([^/]+)";
  });
  // A trailing slash is the same page ("/top/" = "/top").
  return { page, re: new RegExp(`^${source}/?$`), names };
});

export function matchPage(pathname: string): { page: PageDef<unknown>; params: Record<string, string> } | null {
  for (const { page, re, names } of COMPILED) {
    const m = re.exec(pathname);
    if (!m) continue;
    const params: Record<string, string> = {};
    names.forEach((name, i) => {
      try {
        params[name] = decodeURIComponent(m[i + 1]);
      } catch {
        params[name] = m[i + 1];
      }
    });
    return { page, params };
  }
  return null;
}

export type ErrorKind = "notfound" | "unavailable" | "error";

export type Resolved =
  | { type: "redirect"; to: string; status: 301 | 302 }
  | (Rendered & { type: "page"; status: number; stations: SavedStation[]; error?: ErrorKind });

const ERROR_TEXT: Record<ErrorKind, { kicker: string; title: string; text: string; status: number; seoTitle: string }> = {
  notfound: {
    kicker: "Off the dial",
    title: "Nothing on this frequency.",
    text: "This page doesn't exist, or the station has left the directory. Search for it or tune in somewhere else.",
    status: 404,
    seoTitle: "Page not found",
  },
  unavailable: {
    kicker: "Static on the line",
    title: "The station list is busy.",
    text: "We couldn't load the list of stations just now. Please try again in a moment.",
    status: 503,
    seoTitle: "Station list busy",
  },
  error: {
    kicker: "Static on the line",
    title: "Something went wrong.",
    text: "Please try again. If it keeps happening, try again a little later.",
    status: 500,
    seoTitle: "Something went wrong",
  },
};

export function errorBody(kind: ErrorKind): Html {
  const e = ERROR_TEXT[kind];
  return container(
    html`<p class="caps text-red-ink">${e.kicker}</p><h1 class="display mt-3 text-[3rem] sm:text-[4.4rem]">${e.title}</h1><p class="mt-4 max-w-xl text-lg text-ink-2">${e.text}</p>${
      kind === "notfound"
        ? ""
        : html`<p class="mt-6"><button type="button" data-retry class="caps inline-flex h-11 cursor-pointer items-center rounded-full bg-ink px-6 text-paper">Try again</button></p>`
    }<div class="mt-8 max-w-xl">${searchBox({ id: "q-error" })}</div><p class="mt-6"><a href="/" class="caps text-red-ink hover:underline">Back to the home page</a></p>`,
    "py-16",
  );
}

export function errorPage(kind: ErrorKind, path: string): Resolved {
  const e = ERROR_TEXT[kind];
  return {
    type: "page",
    status: e.status,
    error: kind,
    // Errors are never cached: the next visit tries again.
    cache: NO_STORE,
    seo: { title: e.seoTitle, path, noindex: true },
    body: errorBody(kind),
    stations: [],
  };
}

/** Loads and renders the page for an address. Never throws: every failure becomes a proper error page. */
export async function resolve(url: URL, visitorCountry: string): Promise<Resolved> {
  const path = url.pathname + url.search;
  const found = matchPage(url.pathname);
  if (!found) return errorPage("notfound", path);
  const ctx: PageContext = { url, params: found.params, visitorCountry };
  let data: unknown;
  try {
    data = await found.page.load(ctx);
  } catch (error) {
    if (error instanceof NotFound) return errorPage("notfound", path);
    if (error instanceof DirectoryUnavailable) {
      console.error("directory unavailable", path, String(error));
      return errorPage("unavailable", path);
    }
    console.error("page failed to load", path, error);
    return errorPage("error", path);
  }
  if (data instanceof Redirect) return { type: "redirect", to: data.to, status: data.status };
  try {
    const { result, stations } = collectStations(() => found.page.render(data, ctx));
    return { type: "page", status: result.status ?? 200, stations, ...result };
  } catch (error) {
    console.error("page failed to render", path, error);
    return errorPage("error", path);
  }
}
