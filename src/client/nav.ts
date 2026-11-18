// Moving between pages inside the site, without reloading the document (so the player keeps playing).
//
// A click on a link to another page of the site: the browser asks the directory for that page's data itself (the
// Worker is not involved), builds the page with the same templates the Worker uses, and only then changes the
// address and shows it. While it waits, the current page stays and a thin bar at the top shows that the next one is
// on its way. Back and Forward show pages already seen at once.
import { fullTitle, headTags } from "../shared/seo.ts";
import { errorPage, resolve, type Resolved } from "../shared/router.ts";
import { pageSkeleton } from "../shared/ui.ts";
import { navActive } from "../shared/layout.ts";
import { track } from "./analytics.ts";
import { settleLogos } from "./logos.ts";
import { morph } from "./morph.ts";
import { rememberStations, syncPage } from "./sync.ts";

/** How long a page may take before it counts as "the station list is busy". */
const PAGE_TIMEOUT_MS = 12_000;
/** The thin loading bar appears only if a page takes longer than this (most take 50–300 ms). */
const PROGRESS_DELAY_MS = 150;
/** On a host without a Worker, the first page shows a skeleton only if building it takes longer than this. */
export const SHELL_SKELETON_DELAY_MS = 500;
const SEEN_PAGES = 30;
const SEEN_FOR_MS = 5 * 60_000;

type Page = Extract<Resolved, { type: "page" }>;

/** A page as shown: its own head tags, its content, and what the browser needs for it. */
type Snapshot = {
  title: string;
  head: string;
  body: string;
  stations: Page["stations"];
  error?: string;
  track?: Page["track"];
  at: number;
};

function snapshotOf(page: Page): Snapshot {
  return {
    title: fullTitle(page.seo),
    // headTags starts with the <title>, which is set through document.title instead.
    head: headTags(page.seo).value.replace(/^<title>[\s\S]*?<\/title>\s*/, ""),
    body: page.body.value,
    stations: page.stations,
    error: page.error,
    track: page.track,
    at: Date.now(),
  };
}

/** Pages already shown in this tab, for Back and Forward. */
const seen = new Map<string, Snapshot>();
let navigation = 0;
let afterShow: (root: HTMLElement, stations: Page["stations"]) => void = () => {};
let visitorCountry = "";

export function configureNav(options: { afterShow: typeof afterShow; visitorCountry: string }) {
  afterShow = options.afterShow;
  visitorCountry = options.visitorCountry;
}

function key(url: URL): string {
  return url.pathname + url.search;
}

// ---- The loading bar --------------------------------------------------------------------------------------------

let progressTimer = 0;
function progressStart() {
  window.clearTimeout(progressTimer);
  progressTimer = window.setTimeout(() => document.getElementById("progress")?.setAttribute("data-active", ""), PROGRESS_DELAY_MS);
  document.documentElement.setAttribute("aria-busy", "true");
}
function progressDone() {
  window.clearTimeout(progressTimer);
  document.getElementById("progress")?.removeAttribute("data-active");
  document.documentElement.removeAttribute("aria-busy");
}

// ---- Loading a page ---------------------------------------------------------------------------------------------

/** The page for an address, built in the browser. Never throws: a slow or failed directory gives the busy page. */
async function build(url: URL): Promise<Resolved> {
  let timer = 0;
  const timeout = new Promise<Resolved>((done) => {
    timer = window.setTimeout(() => done(errorPage("unavailable", key(url))), PAGE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([resolve(url, visitorCountry), timeout]);
  } catch (error) {
    console.error("building the page failed", key(url), error);
    return errorPage("error", key(url));
  } finally {
    window.clearTimeout(timer);
  }
}

/** Follows redirects (an old address, a station's renamed address) to the page itself, at most a few times. */
async function buildFollowing(start: URL): Promise<{ url: URL; page: Snapshot }> {
  let url = start;
  for (let hops = 0; hops < 4; hops++) {
    const resolved = await build(url);
    if (resolved.type === "page") return { url, page: snapshotOf(resolved) };
    url = new URL(resolved.to, window.location.origin);
  }
  return { url, page: snapshotOf(errorPage("error", key(url)) as Page) };
}

// ---- Showing a page ---------------------------------------------------------------------------------------------

function setHead(page: Snapshot) {
  document.title = page.title;
  for (const el of document.head.querySelectorAll("[data-seo]")) el.remove();
  const template = document.createElement("template");
  template.innerHTML = page.head;
  // The new tags go where the old ones were (before the stylesheets).
  const anchor = document.head.querySelector("link[rel=preload], link[rel=stylesheet]");
  for (const el of [...template.content.children]) document.head.insertBefore(el, anchor);
}

/** Header state that depends on the page: the current menu entry, the header search box, the mobile menu. */
export function updateHeader(pathname: string) {
  for (const a of document.querySelectorAll<HTMLAnchorElement>("[data-nav]")) {
    if (navActive(a.dataset.nav ?? "", pathname)) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const search = document.querySelector<HTMLElement>("[data-header-search]");
  if (search) search.hidden = pathname === "/";
  closeMenu();
}

export function closeMenu() {
  const button = document.querySelector<HTMLButtonElement>("[data-menu]");
  const menu = document.getElementById("mobile-nav");
  if (!button || !menu) return;
  menu.hidden = true;
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Open menu");
}

function remember(url: URL, page: Snapshot) {
  seen.delete(key(url));
  seen.set(key(url), page);
  if (seen.size > SEEN_PAGES) seen.delete(seen.keys().next().value as string);
}

/** Counts a page view (and a search) for the anonymous visitor numbers. Error pages and the dashboard don't count. */
export function countView(url: URL, page: Pick<Snapshot, "error" | "track">) {
  if (page.error || url.pathname.startsWith("/dashboard")) return;
  track("pageview", { path: viewOf(url) });
  if (page.track) track(page.track.type, { label: page.track.label, value: page.track.value });
}

function show(url: URL, page: Snapshot) {
  const main = document.getElementById("main");
  if (!main) return;
  setHead(page);
  main.innerHTML = page.body;
  updateHeader(url.pathname);
  afterShow(main, page.stations);
  remember(url, page);
  countView(url, page);
  // Screen readers: say which page opened, and start reading from its content.
  const announcer = document.getElementById("announcer");
  if (announcer) announcer.textContent = document.title;
  main.focus({ preventScroll: true });
}

/** The page a location shows. Turning the home page dial only changes ?country=, which is not a new page. */
export function viewOf(url: URL): string {
  if (url.pathname !== "/") return url.pathname + url.search;
  const params = new URLSearchParams(url.search);
  params.delete("country");
  const rest = params.toString();
  return rest ? `/?${rest}` : "/";
}

function scrollAfter(url: URL, mode: "top" | "keep" | number) {
  if (typeof mode === "number") {
    window.scrollTo(0, mode);
    return;
  }
  if (mode === "keep") return;
  const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}

function saveScroll() {
  history.replaceState({ ...(history.state ?? {}), scroll: window.scrollY }, "");
}

/** Opens another page of the site. The address changes only once the page is ready. */
export async function go(target: URL, options: { replace?: boolean; keepScroll?: boolean } = {}) {
  const mine = ++navigation;
  progressStart();
  const { url, page } = await buildFollowing(target);
  if (mine !== navigation) return; // a newer click won
  progressDone();
  saveScroll();
  const final = new URL(url);
  final.hash = target.hash;
  if (options.replace) history.replaceState({ scroll: 0 }, "", final);
  else history.pushState({ scroll: 0 }, "", final);
  show(final, page);
  scrollAfter(final, options.keepScroll ? "keep" : "top");
}

/** Back and Forward: pages seen in the last few minutes show at once; others load first, like a click. */
async function onPopState(e: PopStateEvent) {
  const url = new URL(window.location.href);
  const scroll = typeof e.state?.scroll === "number" ? (e.state.scroll as number) : 0;
  const mine = ++navigation;
  const cached = seen.get(key(url));
  if (cached && Date.now() - cached.at < SEEN_FOR_MS) {
    progressDone();
    show(url, cached);
    scrollAfter(url, scroll);
    return;
  }
  progressStart();
  const { page } = await buildFollowing(url);
  if (mine !== navigation) return;
  progressDone();
  show(url, page);
  scrollAfter(url, scroll);
}

/**
 * A host without a Worker (plain files, e.g. GitHub Pages) sends the same empty shell for every address: build the
 * page here. If that takes longer than half a second, a skeleton stands in until it is ready.
 */
export async function buildShell() {
  const main = document.getElementById("main");
  const start = new URL(window.location.href);
  const skeleton = window.setTimeout(() => {
    if (main && !main.hasChildNodes()) main.innerHTML = pageSkeleton().value;
  }, SHELL_SKELETON_DELAY_MS);
  const { url, page } = await buildFollowing(start);
  window.clearTimeout(skeleton);
  const final = new URL(url);
  final.hash = start.hash;
  if (key(final) !== key(start)) history.replaceState({ scroll: 0 }, "", final);
  show(final, page);
  scrollAfter(final, "top");
}

/**
 * The page the Worker sent is remembered too (as it arrived, before this script changed anything), so Back to it
 * is instant.
 */
export function rememberFirstPage(state: { stations: Page["stations"]; error?: string; track?: Page["track"] }) {
  const main = document.getElementById("main");
  if (!main) return;
  remember(new URL(window.location.href), {
    title: document.title,
    head: [...document.head.querySelectorAll("[data-seo]")].map((el) => el.outerHTML).join("\n"),
    body: main.innerHTML,
    stations: state.stations,
    error: state.error,
    track: undefined, // already counted for this visit
    at: Date.now(),
  });
}

/** The Worker's cache keeps list pages fresh for 10 minutes and rebuilds older ones itself (src/worker/index.ts). */
const FRESH_FOR_MS = 10 * 60_000;

/**
 * A backstop for a copy older than the Worker's cache would ever serve fresh (one the browser kept itself, or the
 * stale copy served while the Worker rebuilds): the browser asks the directory again in the background, builds the
 * page with the fresh data and compares it with what is on screen; only the parts that differ change (morph.ts).
 * Nothing changes if the data is the same, and nothing is thrown away if the directory doesn't answer.
 */
export function revalidate(builtAt: number | undefined) {
  if (!builtAt || Date.now() - builtAt < FRESH_FOR_MS) return;
  const here = new URL(window.location.href);
  const mine = navigation;
  void build(here).then((resolved) => {
    // Only the same page still on screen, and only data that actually built.
    if (mine !== navigation || resolved.type !== "page" || resolved.error) return;
    if (key(new URL(window.location.href)) !== key(here)) return;
    const main = document.getElementById("main");
    if (!main) return;
    const page = snapshotOf(resolved);
    const changed = morph(main, page.body);
    if (changed === 0) return;
    setHead(page);
    rememberStations(page.stations);
    settleLogos(main);
    syncPage();
    remember(here, page);
  });
}

/** Links this script opens itself. Anything else (another site, a file, the dashboard) loads normally. */
function handles(url: URL): boolean {
  if (url.origin !== window.location.origin) return false;
  if (/^\/(api|dashboard|sitemaps?)(\/|$|\.)/.test(url.pathname)) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return false; // robots.txt, sitemap.xml, images, the manifest
  return true;
}

export function initNav() {
  history.scrollRestoration = "manual";
  if (!history.state) history.replaceState({ scroll: 0 }, "");

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.("a");
    if (!a || !a.href || a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href);
    if (!handles(url)) return;
    const here = new URL(window.location.href);
    // A jump within the same page (#letter-A): the browser does it.
    if (url.pathname === here.pathname && url.search === here.search && url.hash) return;
    e.preventDefault();
    if (key(url) === key(here)) {
      window.scrollTo(0, 0);
      return;
    }
    void go(url, { keepScroll: a.hasAttribute("data-keep-scroll") });
  });

  // Search boxes: the form would load /search?q=… as a new document; open it inside the site instead.
  document.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement;
    if (!form.matches("[data-search]")) return;
    const q = String(new FormData(form).get("q") ?? "").trim();
    if (q.length < 2) return;
    e.preventDefault();
    (form.querySelector("input") as HTMLInputElement | null)?.blur();
    void go(new URL(`/search?q=${encodeURIComponent(q)}`, window.location.origin));
  });

  window.addEventListener("popstate", (e) => void onPopState(e));
}
