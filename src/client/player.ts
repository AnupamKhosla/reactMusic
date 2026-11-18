// The one audio player of the site. Pages change inside the open document (History API), so it keeps playing while
// the visitor moves around. Every part of the page that shows the player's state listens to onChange (sync.ts,
// the player bar below).
import { html } from "../shared/html.ts";
import { icon } from "../shared/icons.ts";
import { paths } from "../shared/names.ts";
import { browserMirror } from "../shared/radio.ts";
import type { SavedStation } from "../shared/types.ts";
import { stationLogo } from "../shared/ui.ts";
import { flushNow, track } from "./analytics.ts";
import { isFavorite, pushRecent, toggleFavorite, toSaved, volumeStore, favoritesStore } from "./storage.ts";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
/** insecure: the stream only exists over plain http, which browsers block on a secure page. */
export type PlayerError = "insecure" | "offline" | "timeout";

const LOAD_TIMEOUT_MS = 20_000;
const LISTEN_REPORT_SECS = 30;

const ERRORS: Record<PlayerError, string> = {
  insecure: "Your browser blocks this station's stream on secure websites.",
  offline: "This station isn't answering right now. Try another one.",
  timeout: "This station is taking too long to start. Try again or pick another one.",
};

type HlsLike = { destroy(): void; loadSource(url: string): void; attachMedia(el: HTMLMediaElement): void; on(ev: string, cb: (...a: unknown[]) => void): void };

export const player = {
  station: null as SavedStation | null,
  status: "idle" as PlayerStatus,
  error: null as PlayerError | null,
  queue: [] as SavedStation[],
  muted: false,
};

const listeners = new Set<() => void>();
export function onChange(listener: () => void) {
  listeners.add(listener);
}
function changed() {
  for (const l of listeners) {
    try {
      l();
    } catch (error) {
      console.error("player listener failed", error);
    }
  }
}

let audio: HTMLAudioElement | null = null;
let hls: HlsLike | null = null;
let attempt = 0;
let upgraded = false;
let loadTimer: ReturnType<typeof setTimeout> | null = null;
let listenFrom: number | null = null;
let counted: string | null = null;

function setStatus(status: PlayerStatus, error: PlayerError | null = null) {
  player.status = status;
  player.error = error;
  changed();
}

/** Reports listening time not yet reported. */
function reportListening(final: boolean) {
  const s = player.station;
  if (listenFrom === null || !s) return;
  const secs = Math.floor((Date.now() - listenFrom) / 1000);
  if (secs >= LISTEN_REPORT_SECS || (final && secs >= 1)) {
    track("listen", { station: s.id, station_name: s.name, value: secs });
    listenFrom = final ? null : Date.now();
  }
  if (final) {
    listenFrom = null;
    flushNow();
  }
}

function clearLoadTimer() {
  if (loadTimer) clearTimeout(loadTimer);
  loadTimer = null;
}

function fail(kind: PlayerError) {
  clearLoadTimer();
  reportListening(true);
  setStatus("error", kind);
  const s = player.station;
  track("play_error", { station: s?.id, station_name: s?.name, label: kind });
}

function teardown() {
  clearLoadTimer();
  if (hls) {
    hls.destroy();
    hls = null;
  }
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
}

function getAudio(): HTMLAudioElement {
  if (audio) return audio;
  const el = new Audio();
  el.preload = "none";
  el.volume = volumeStore.read();
  el.addEventListener("playing", () => {
    clearLoadTimer();
    setStatus("playing");
    const s = player.station;
    if (listenFrom === null) listenFrom = Date.now();
    if (s && counted !== `${s.id}:${attempt}`) {
      counted = `${s.id}:${attempt}`;
      track("playing", { station: s.id, station_name: s.name });
      // Tell the community directory this station was listened to (it ranks stations by these clicks).
      browserMirror()
        .then((mirror) => fetch(`https://${mirror}/json/url/${s.id}`, { mode: "cors" }))
        .catch(() => {
          /* best effort */
        });
    }
  });
  el.addEventListener("pause", () => {
    if (el.ended || el.error) return;
    reportListening(true);
    if (player.status !== "error" && player.status !== "idle") setStatus("paused");
  });
  el.addEventListener("waiting", () => {
    if (player.status === "playing") setStatus("loading");
  });
  el.addEventListener("error", () => {
    if (!el.getAttribute("src") && !hls) return;
    fail(upgraded ? "insecure" : "offline");
  });
  setInterval(() => {
    if (!el.paused) reportListening(false);
  }, 10_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !el.paused) {
      // Keep counting in the background, but make sure what was heard so far is saved.
      reportListening(false);
      flushNow();
    }
  });
  audio = el;
  return el;
}

async function start(s: SavedStation) {
  const el = getAudio();
  const mine = ++attempt;
  reportListening(true);
  teardown();
  player.station = s;
  setStatus("loading");
  pushRecent(s);
  track("play", { station: s.id, station_name: s.name });

  let url = s.stream;
  upgraded = false;
  if (window.location.protocol === "https:" && /^http:\/\//i.test(url)) {
    // Browsers refuse plain-http audio on a secure page; many stations answer on https as well.
    url = url.replace(/^http:\/\//i, "https://");
    upgraded = true;
  }

  loadTimer = setTimeout(() => {
    if (attempt === mine) {
      teardown();
      fail(upgraded ? "insecure" : "timeout");
    }
  }, LOAD_TIMEOUT_MS);

  try {
    const nativeHls = el.canPlayType("application/vnd.apple.mpegurl") !== "";
    if (s.hls && !nativeHls) {
      const { default: Hls } = await import("hls.js");
      if (attempt !== mine) return;
      if (Hls.isSupported()) {
        const h = new Hls({ enableWorker: true, lowLatencyMode: false }) as unknown as HlsLike;
        hls = h;
        h.on("hlsError", (_e, data) => {
          if ((data as { fatal?: boolean })?.fatal && attempt === mine) {
            teardown();
            fail(upgraded ? "insecure" : "offline");
          }
        });
        h.loadSource(url);
        h.attachMedia(el);
      } else {
        el.src = url;
      }
    } else {
      el.src = url;
    }
    await el.play();
  } catch (e) {
    if (attempt !== mine) return;
    const name = (e as DOMException)?.name;
    // AbortError: a newer play() replaced this one. NotAllowedError: the browser wants a tap first.
    if (name === "AbortError") return;
    if (name === "NotAllowedError") {
      clearLoadTimer();
      setStatus("paused");
      return;
    }
    // hls.js failed to download (offline, blocked): same as a station that doesn't answer.
    teardown();
    fail(upgraded ? "insecure" : "offline");
  }
}

export function play(station: SavedStation, queue?: SavedStation[]) {
  if (queue && queue.length > 1) player.queue = queue.map(toSaved);
  void start(toSaved(station));
}

export function toggle() {
  const s = player.station;
  if (!s) return;
  if (player.status === "playing" || player.status === "loading") {
    audio?.pause();
    clearLoadTimer();
    setStatus("paused");
  } else {
    // Live radio: resume at the live edge, not where it was paused.
    void start(s);
  }
}

export function stop() {
  reportListening(true);
  teardown();
  player.station = null;
  setStatus("idle");
}

function step(dir: 1 | -1) {
  const s = player.station;
  if (!s || player.queue.length < 2) return;
  const i = player.queue.findIndex((q) => q.id === s.id);
  void start(player.queue[(i + dir + player.queue.length) % player.queue.length]);
}

export function setVolume(v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  volumeStore.write(clamped);
  const el = getAudio();
  el.volume = clamped;
  if (clamped > 0 && player.muted) {
    player.muted = false;
    el.muted = false;
  }
  updateVolume();
}

export function toggleMute() {
  player.muted = !player.muted;
  getAudio().muted = player.muted;
  updateVolume();
}

// ---- Lock screen and headphone buttons ------------------------------------------------------------------------

function updateMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  const s = player.station;
  if (s) {
    ms.metadata = new MediaMetadata({
      title: s.name,
      artist: [s.country, s.tags[0]].filter(Boolean).join(" · "),
      album: "LiveRadio",
      artwork: s.favicon ? [{ src: s.favicon, sizes: "512x512" }] : [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
    });
  }
  ms.playbackState = player.status === "playing" ? "playing" : player.status === "paused" ? "paused" : "none";
  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      /* not supported in this browser */
    }
  };
  set("play", toggle);
  set("pause", toggle);
  set("stop", stop);
  set("nexttrack", player.queue.length > 1 ? () => step(1) : null);
  set("previoustrack", player.queue.length > 1 ? () => step(-1) : null);
}

// ---- The player bar ------------------------------------------------------------------------------------------

let barFor: string | null = null;

function root(): HTMLElement | null {
  return document.getElementById("player-root");
}

/** Draws the bar for a new station; status changes only update its parts (so dragging the volume never breaks). */
function renderBar() {
  const el = root();
  if (!el) return;
  const s = player.station;
  if (!s) {
    el.innerHTML = "";
    barFor = null;
    return;
  }
  if (barFor !== s.id) {
    barFor = s.id;
    const btn = "bar-btn";
    el.innerHTML = html`<section aria-label="Player" class="fixed inset-x-0 bottom-0 z-40 border-t border-black/40 bg-bar text-on-bar shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
<div data-bar-error role="alert" class="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-sm sm:px-6" hidden>${icon("alert", 16, "flex-none text-[#ff8a70]")}<span data-bar-error-text></span><a data-bar-stream href="${
      s.stream
    }" target="_blank" rel="noopener noreferrer nofollow" class="ml-1 inline-flex items-center gap-1 underline" hidden>Open the stream in a new tab ${icon("external", 14)}</a></div>
<div class="mx-auto flex h-[4.5rem] max-w-[1400px] items-center gap-3 px-3 sm:px-6">${stationLogo(s.name, s.favicon, 44, true)}
<div class="min-w-0 flex-1"><a href="${paths.station(s)}" class="block truncate font-semibold hover:underline">${s.name}</a><p class="flex items-center gap-2 text-sm text-on-bar-muted" aria-live="polite"><span data-bar-status class="caps rounded-full px-2 py-0.5 text-[0.65rem]"></span><span class="truncate">${[
      s.country,
      s.tags[0],
    ]
      .filter(Boolean)
      .join(" · ")}</span></p></div>
<div class="flex items-center gap-1"><button type="button" class="${btn} hidden sm:grid" data-bar="prev" aria-label="Previous station">${icon("prev", 18)}</button><button type="button" data-bar="toggle" class="bar-play">${icon(
      "play",
      20,
      "i-play",
    )}${icon("pause", 20, "i-pause")}${icon("spinner", 20, "i-busy")}</button><button type="button" class="${btn} hidden sm:grid" data-bar="next" aria-label="Next station">${icon("next", 18)}</button></div>
<button type="button" class="${btn} bar-fav" data-fav="${s.id}" aria-pressed="false" aria-label="Add ${s.name} to favourites">${icon("heart", 20)}</button>
<div class="hidden items-center gap-1 md:flex"><button type="button" class="${btn}" data-bar="mute" aria-label="Mute" aria-pressed="false"><span class="vol-on">${icon("volume", 20)}</span><span class="vol-off">${icon(
      "muted",
      20,
    )}</span></button><input type="range" min="0" max="1" step="0.05" data-bar="volume" aria-label="Volume" class="volume w-24"></div>
<button type="button" class="${btn}" data-bar="stop" aria-label="Stop and close the player">${icon("close", 18)}</button>
</div></section>`.value;
  }
  updateBar();
}

function updateBar() {
  const el = root();
  const s = player.station;
  if (!el || !s) return;
  const playing = player.status === "playing";
  const loading = player.status === "loading";
  const status = el.querySelector<HTMLElement>("[data-bar-status]");
  if (status) {
    status.textContent = loading ? "Tuning in…" : playing ? "Live" : player.status === "error" ? "Not playing" : "Paused";
    status.className = `caps rounded-full px-2 py-0.5 text-[0.65rem] ${playing ? "bg-red text-on-red" : "border border-white/30 text-on-bar"}`;
  }
  const toggleBtn = el.querySelector<HTMLElement>('[data-bar="toggle"]');
  if (toggleBtn) {
    toggleBtn.dataset.state = loading ? "loading" : playing ? "playing" : "";
    toggleBtn.setAttribute("aria-label", playing || loading ? `Pause ${s.name}` : `Play ${s.name}`);
  }
  for (const name of ["prev", "next"]) el.querySelector<HTMLButtonElement>(`[data-bar="${name}"]`)?.toggleAttribute("disabled", player.queue.length < 2);
  const errorBox = el.querySelector<HTMLElement>("[data-bar-error]");
  if (errorBox) {
    const err = player.status === "error" ? player.error : null;
    errorBox.hidden = !err;
    const text = errorBox.querySelector("[data-bar-error-text]");
    if (text) text.textContent = err ? ERRORS[err] : "";
    const link = errorBox.querySelector<HTMLElement>("[data-bar-stream]");
    if (link) link.hidden = err !== "insecure";
  }
  updateVolume();
}

function updateVolume() {
  const el = root();
  if (!el) return;
  const level = player.muted ? 0 : volumeStore.read();
  const range = el.querySelector<HTMLInputElement>('[data-bar="volume"]');
  if (range && document.activeElement !== range) range.value = String(level);
  range?.style.setProperty("--level", `${Math.round(level * 100)}%`);
  const mute = el.querySelector<HTMLElement>('[data-bar="mute"]');
  if (mute) {
    mute.setAttribute("aria-pressed", String(player.muted));
    mute.setAttribute("aria-label", player.muted ? "Unmute" : "Mute");
    mute.dataset.muted = player.muted || level === 0 ? "true" : "false";
  }
}

export function initPlayer() {
  onChange(renderBar);
  onChange(updateMediaSession);
  const el = root();
  if (!el) return;
  el.addEventListener("click", (e) => {
    const target = (e.target as Element).closest<HTMLElement>("[data-bar]");
    if (!target) return;
    switch (target.dataset.bar) {
      case "toggle":
        toggle();
        break;
      case "prev":
        step(-1);
        break;
      case "next":
        step(1);
        break;
      case "stop":
        stop();
        break;
      case "mute":
        toggleMute();
        break;
    }
  });
  el.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    if (target.dataset.bar === "volume") setVolume(Number(target.value));
  });
  favoritesStore.subscribe(changed);
}

export { isFavorite, toggleFavorite };
