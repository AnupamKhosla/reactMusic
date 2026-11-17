// Anonymous visit counting for the /stats dashboard. Browser only.
// - A random id in this browser (localStorage) tells new visitors from returning ones. No cookies, no IP address.
// - A visit counts as a real person only after a real tap, click, key press or scroll.
// - Browsers that send "Global Privacy Control" get an id that lasts only for the tab.
// - The owner can switch counting off for their own browser on /stats.

export type EventType =
  | "pageview"
  | "engage"
  | "play"
  | "playing"
  | "listen"
  | "play_error"
  | "search"
  | "favorite"
  | "share";

type Event = {
  type: EventType;
  ts: number;
  path?: string;
  station?: string;
  station_name?: string;
  value?: number;
  label?: string;
};

const VISIT_IDLE_MS = 30 * 60 * 1000;
const OPT_OUT_KEY = "lr.no-stats";

let queue: Event[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let engaged = false;
let started = false;
let sessionInfoSent = false;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function storageFor(kind: "visitor" | "session"): Storage | null {
  try {
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    if (kind === "visitor" && !gpc) return window.localStorage;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function visitorId(): string {
  const store = storageFor("visitor");
  let id = store?.getItem("lr.vid");
  if (!id) {
    id = randomId();
    store?.setItem("lr.vid", id);
  }
  return id;
}

/** A visit id that rolls over after 30 minutes without activity. */
function sessionId(): { id: string; fresh: boolean } {
  const store = storageFor("session");
  const now = Date.now();
  const last = Number(store?.getItem("lr.sid.at") || 0);
  let id = store?.getItem("lr.sid") || "";
  let fresh = false;
  if (!id || now - last > VISIT_IDLE_MS) {
    id = randomId();
    fresh = true;
    store?.setItem("lr.sid", id);
    sessionInfoSent = false;
    engaged = false;
  }
  store?.setItem("lr.sid.at", String(now));
  return { id, fresh };
}

export function statsDisabled(): boolean {
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStatsDisabled(disabled: boolean) {
  try {
    if (disabled) window.localStorage.setItem(OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}

function landingInfo() {
  const url = new URL(window.location.href);
  const ref = document.referrer ? new URL(document.referrer) : null;
  return {
    referrer: ref && ref.host !== window.location.host ? ref.host : "",
    utm_source: url.searchParams.get("utm_source") || "",
    utm_medium: url.searchParams.get("utm_medium") || "",
    utm_campaign: url.searchParams.get("utm_campaign") || "",
    landing: url.pathname,
    width: window.innerWidth,
    webdriver: navigator.webdriver === true,
    lang: navigator.language || "",
  };
}

function flush(useBeacon = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0 || statsDisabled()) {
    queue = [];
    return;
  }
  const { id: session } = sessionId();
  const payload: Record<string, unknown> = { v: 1, visitor: visitorId(), session, events: queue.splice(0, 40) };
  if (!sessionInfoSent) {
    payload.info = landingInfo();
    sessionInfoSent = true;
  }
  const body = JSON.stringify(payload);
  // text/plain keeps the request simple (no CORS preflight) and works with sendBeacon.
  const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
  let sent = false;
  if (useBeacon && navigator.sendBeacon) sent = navigator.sendBeacon("/api/collect", blob);
  if (!sent) {
    fetch("/api/collect", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(
      () => {
        /* stats are best effort */
      },
    );
  }
  if (queue.length > 0) schedule(500);
}

function schedule(ms: number) {
  if (timer) return;
  timer = setTimeout(() => flush(false), ms);
}

export function track(type: EventType, data: Omit<Event, "type" | "ts"> = {}) {
  if (typeof window === "undefined" || statsDisabled()) return;
  const { fresh } = sessionId();
  if (fresh) sessionInfoSent = false;
  queue.push({ type, ts: Date.now(), path: data.path ?? window.location.pathname, ...data });
  // The first page view goes at once so a visit is recorded even if the visitor leaves quickly.
  schedule(type === "pageview" && !started ? 0 : 3000);
  started = true;
}

function onFirstInteraction() {
  if (engaged) return;
  engaged = true;
  track("engage");
}

/** Call once in the browser. */
export function startAnalytics() {
  if (typeof window === "undefined") return;
  const opts = { passive: true, capture: true } as AddEventListenerOptions;
  for (const type of ["pointerdown", "keydown", "touchstart", "wheel"]) window.addEventListener(type, onFirstInteraction, opts);
  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY > 200) onFirstInteraction();
    },
    opts,
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}

/** Sends anything queued right away (used when listening stops). */
export function flushNow() {
  flush(true);
}
