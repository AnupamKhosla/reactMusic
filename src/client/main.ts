// The browser side of LiveRadio: a few KB of plain code, no framework.
//
// Two ways a page arrives:
// - "server": the Worker sent the finished page (every direct visit on liveradio.space). The script only adds
//   what needs a browser: the player, favourites, the dial, and opening later pages inside the site.
// - "shell": a host without a Worker (plain files, e.g. GitHub Pages) sent an empty frame; the script builds the
//   page itself from the directory, with the same templates.
import "../styles.css";
import type { PageState } from "../shared/layout.ts";
import { configureDirectory } from "../shared/radio.ts";
import type { SavedStation } from "../shared/types.ts";
import { startAnalytics, setStatsDisabled, statsDisabled, track } from "./analytics.ts";
import { initDial } from "./dial.ts";
import { initLogos, settleLogos } from "./logos.ts";
import { buildShell, closeMenu, configureNav, countView, go, initNav, rememberFirstPage, revalidate } from "./nav.ts";
import { clearFavoritesClicked, drawPersonal } from "./personal.ts";
import { initPlayer, onChange, play, player, toggle, toggleFavorite } from "./player.ts";
import { favoritesStore, recentStore } from "./storage.ts";
import { queueFor, rememberStations, stationFor, syncPage } from "./sync.ts";

configureDirectory({ extras: () => ({}) });

function readState(): PageState {
  try {
    const text = document.getElementById("lr-state")?.textContent;
    if (text) return JSON.parse(text) as PageState;
  } catch (error) {
    console.error("page state unreadable", error);
  }
  return { rendered: "shell", stations: [] };
}

/** The visitor's country for the home page dial: from the Worker, else remembered, else the browser's language. */
function visitorCountry(fromWorker?: string): string {
  try {
    if (fromWorker) {
      sessionStorage.setItem("lr.cc", fromWorker);
      return fromWorker;
    }
    const saved = sessionStorage.getItem("lr.cc");
    if (saved) return saved;
  } catch {
    /* storage blocked */
  }
  const region = /-([A-Z]{2})\b/.exec(navigator.language || "")?.[1];
  return region ?? "";
}

/** Everything a page needs once it is in place (the first page, and every page opened inside the site). */
function afterShow(root: HTMLElement, stations: SavedStation[] = []) {
  rememberStations(stations);
  drawPersonal(root);
  initDial(root);
  initCountMe(root);
  settleLogos(root);
  syncPage();
}

function initCountMe(root: ParentNode) {
  for (const box of root.querySelectorAll<HTMLInputElement>("[data-count-me]")) {
    box.checked = !statsDisabled();
    box.disabled = false;
    const note = box.parentElement?.querySelector("[data-count-me-note]");
    const update = () => {
      if (note) note.textContent = box.checked ? "On for this browser." : "Off for this browser. Nothing is sent.";
    };
    update();
    box.addEventListener("change", () => {
      setStatsDisabled(!box.checked);
      update();
    });
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false; // clipboard blocked (insecure page, permissions)
  }
}

function flashLabel(el: Element | null, text: string, back: string) {
  if (!el) return;
  el.textContent = text;
  window.setTimeout(() => (el.textContent = back), 2000);
}

/** One listener for every button on every page (pages are replaced, the listener stays). */
function onClick(e: MouseEvent) {
  const target = e.target as Element;

  const playBtn = target.closest<HTMLElement>("[data-play]");
  if (playBtn) {
    const id = playBtn.dataset.play ?? "";
    const station = stationFor(id);
    if (!station) return;
    if (player.station?.id === id && (player.status === "playing" || player.status === "loading")) toggle();
    else play(station, queueFor(playBtn));
    return;
  }

  const favBtn = target.closest<HTMLElement>("[data-fav]");
  if (favBtn) {
    const station = stationFor(favBtn.dataset.fav ?? "");
    if (station && toggleFavorite(station)) track("favorite", { station: station.id, station_name: station.name });
    return;
  }

  const share = target.closest<HTMLElement>("[data-share]");
  if (share) {
    void (async () => {
      const url = window.location.href.split("?")[0];
      const name = share.dataset.shareName ?? "";
      track("share", { station: share.dataset.share, station_name: name });
      if (navigator.share) {
        try {
          await navigator.share({ title: `${name} on LiveRadio`, url });
          return;
        } catch {
          /* cancelled or refused: copy the link instead */
        }
      }
      flashLabel(share.querySelector("[data-share-label]"), (await copyText(url)) ? "Link copied" : "Copy blocked", "Share");
    })();
    return;
  }

  const copy = target.closest<HTMLElement>("[data-copy]");
  if (copy) {
    void copyText(copy.dataset.copy ?? "").then((ok) => {
      flashLabel(copy.querySelector("[data-copy-label]"), ok ? "Copied" : "Copy blocked", "Copy");
      copy.setAttribute("aria-label", ok ? "Stream address copied" : "Copy the stream address");
    });
    return;
  }

  const clear = target.closest<HTMLButtonElement>("[data-clear-favorites]");
  if (clear) {
    clearFavoritesClicked(clear);
    return;
  }

  // "Try again" on a busy or failed page: build it again, in place.
  if (target.closest("[data-retry]")) {
    void go(new URL(window.location.href), { replace: true });
    return;
  }

  const menu = target.closest<HTMLButtonElement>("[data-menu]");
  if (menu) {
    const nav = document.getElementById("mobile-nav");
    if (!nav) return;
    const open = nav.hidden;
    if (open) {
      nav.hidden = false;
      menu.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-label", "Close menu");
    } else closeMenu();
  }
}

function boot() {
  const state = readState();
  const main = document.getElementById("main");
  rememberStations(state.stations);
  configureNav({ afterShow, visitorCountry: visitorCountry(state.cc) });
  initLogos();
  initPlayer();
  initNav();
  startAnalytics();
  document.addEventListener("click", onClick);
  onChange(() => syncPage());
  favoritesStore.subscribe(() => drawPersonal());
  recentStore.subscribe(() => {
    drawPersonal();
    syncPage();
  });

  if (state.rendered === "shell" || !main) {
    void buildShell();
    return;
  }
  // The Worker's page is already in place: remember it as it arrived, add what needs the browser, count the visit.
  rememberFirstPage(state);
  afterShow(main);
  countView(new URL(window.location.href), state);
  if (!state.error) revalidate(state.builtAt);
}

boot();
