// The station directory (the free, community-run Radio Browser database), read on the server only.
// Its mirrors come and go (fi1 vanished in 2026), so the list of mirrors is discovered, not hard-coded.

import { countryName, nameSlug, slugify, titleCase } from "./names";
import type { Country, Genre, Language, Station } from "./types";

const USER_AGENT = "LiveRadio/2.0 (+https://liveradio.space)";
const FALLBACK_MIRRORS = ["de1.api.radio-browser.info", "de2.api.radio-browser.info"];

let mirrors: string[] | null = null;
let mirrorsAt = 0;
let preferred: string | null = null;

async function discoverMirrors(): Promise<string[]> {
  if (mirrors && Date.now() - mirrorsAt < 6 * 3600_000) return mirrors;
  let found: string[] = [];
  try {
    const res = await fetch("https://all.api.radio-browser.info/json/servers", {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(3000),
      cf: { cacheTtl: 21600, cacheEverything: true },
    } as RequestInit);
    if (res.ok) {
      const list = (await res.json()) as { name: string }[];
      found = list.map((s) => s.name).filter((n) => /^[a-z0-9.-]+$/i.test(n));
    }
  } catch {
    /* use the fallback list */
  }
  const unique = [...new Set([...found, ...FALLBACK_MIRRORS])];
  // Spread the load across mirrors, as the directory asks.
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  mirrors = unique;
  mirrorsAt = Date.now();
  return mirrors;
}

/** The mirror the browser should use for click counting (so each listener's own click counts). */
export async function browserMirror(): Promise<string> {
  const list = await discoverMirrors();
  return preferred ?? list[0] ?? FALLBACK_MIRRORS[0];
}

// A small per-isolate memory cache on top of Cloudflare's cache, for the lists every page needs.
const memory = new Map<string, { at: number; ttl: number; value: unknown }>();
function remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < hit.ttl * 1000) return Promise.resolve(hit.value as T);
  return load().then((value) => {
    if (memory.size > 200) memory.delete(memory.keys().next().value as string);
    memory.set(key, { at: Date.now(), ttl: ttlSeconds, value });
    return value;
  });
}

export class DirectoryUnavailable extends Error {}

async function api<T>(path: string, cacheTtl = 900): Promise<T> {
  const list = await discoverMirrors();
  const order = preferred ? [preferred, ...list.filter((m) => m !== preferred)] : list;
  let lastError: unknown;
  for (const host of order) {
    try {
      const res = await fetch(`https://${host}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
        cf: { cacheTtl, cacheEverything: true },
      } as RequestInit);
      if (!res.ok) throw new Error(`${host} answered ${res.status}`);
      const body = (await res.json()) as T;
      preferred = host;
      return body;
    } catch (error) {
      lastError = error;
      if (preferred === host) preferred = null;
    }
  }
  throw new DirectoryUnavailable(String(lastError ?? "no mirror answered"));
}

type RawStation = {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  codec: string;
  bitrate: number;
  hls: number;
  votes: number;
  clickcount: number;
  clicktrend: number;
  lastcheckok: number;
  lastcheckoktime_iso8601?: string;
  lastchangetime_iso8601?: string;
  geo_lat: number | null;
  geo_long: number | null;
};

function cleanName(name: string): string {
  return (name || "").replace(/\s+/g, " ").trim().slice(0, 120) || "Unnamed station";
}

export function toStation(raw: RawStation): Station {
  const stream = (raw.url_resolved || raw.url || "").trim();
  const tags = [
    ...new Set(
      (raw.tags || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t && t.length <= 40),
    ),
  ].slice(0, 8);
  const languages = [
    ...new Set(
      (raw.language || "")
        .split(",")
        .map((l) => l.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 4);
  const cc = (raw.countrycode || "").toUpperCase();
  return {
    id: raw.stationuuid,
    name: cleanName(raw.name),
    stream,
    hls: raw.hls === 1 || /\.m3u8(\?|$)/i.test(stream),
    homepage: /^https?:\/\//i.test(raw.homepage || "") ? raw.homepage.trim() : "",
    favicon: /^https?:\/\//i.test(raw.favicon || "") ? raw.favicon.trim().replace(/^http:\/\//i, "https://") : "",
    tags,
    countrycode: cc,
    country: cc ? countryName(cc, raw.country) : titleCase(raw.country || ""),
    state: (raw.state || "").trim(),
    languages,
    codec: (raw.codec || "").toUpperCase() === "UNKNOWN" ? "" : (raw.codec || "").toUpperCase(),
    bitrate: raw.bitrate || 0,
    votes: raw.votes || 0,
    clicks: raw.clickcount || 0,
    trend: raw.clicktrend || 0,
    ok: raw.lastcheckok === 1,
    lastOk: raw.lastcheckoktime_iso8601 || "",
    updated: raw.lastchangetime_iso8601 || "",
    geo: raw.geo_lat != null && raw.geo_long != null ? [raw.geo_lat, raw.geo_long] : null,
  };
}

export type Order = "clickcount" | "votes" | "clicktrend" | "name" | "bitrate" | "lastcheckok";

export type StationQuery = {
  name?: string;
  countrycode?: string;
  language?: string;
  tag?: string;
  order?: Order;
  limit?: number;
  offset?: number;
};

export async function searchStations(q: StationQuery, cacheTtl = 900): Promise<Station[]> {
  const p = new URLSearchParams();
  if (q.name) p.set("name", q.name);
  if (q.countrycode) p.set("countrycode", q.countrycode.toUpperCase());
  if (q.language) {
    p.set("language", q.language);
    p.set("languageExact", "true");
  }
  if (q.tag) {
    p.set("tag", q.tag);
    p.set("tagExact", "true");
  }
  const order = q.order ?? "clickcount";
  p.set("order", order);
  p.set("reverse", order === "name" ? "false" : "true");
  p.set("hidebroken", "true");
  p.set("limit", String(Math.min(q.limit ?? 48, 500)));
  p.set("offset", String(Math.max(q.offset ?? 0, 0)));
  const key = `search?${p}`;
  return remember(key, Math.min(cacheTtl, 600), async () => {
    const raw = await api<RawStation[]>(`/json/stations/search?${p}`, cacheTtl);
    return dedupe(raw.map(toStation).filter((s) => s.stream));
  });
}

/** The directory often lists the same stream several times; keep the most popular copy. */
function dedupe(stations: Station[]): Station[] {
  const seen = new Set<string>();
  return stations.filter((s) => {
    const key = `${s.name.toLowerCase()}|${s.stream.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function stationById(id: string): Promise<Station | null> {
  return remember(`station:${id}`, 600, async () => {
    const raw = await api<RawStation[]>(`/json/stations/byuuid/${encodeURIComponent(id)}`, 900);
    return raw[0] ? toStation(raw[0]) : null;
  });
}

export async function stationsByIds(ids: string[]): Promise<Station[]> {
  if (ids.length === 0) return [];
  const raw = await api<RawStation[]>(`/json/stations/byuuid?uuids=${ids.map(encodeURIComponent).join(",")}`, 900);
  return raw.map(toStation);
}

export const SITEMAP_STATIONS_PER_FILE = 500;
export const SITEMAP_STATION_FILES = 10;

/** The most listened-to stations, for the sitemaps (only the fields a sitemap needs). */
export async function sitemapStations(file: number): Promise<{ id: string; name: string; updated: string }[]> {
  const p = new URLSearchParams({
    order: "clickcount",
    reverse: "true",
    hidebroken: "true",
    limit: String(SITEMAP_STATIONS_PER_FILE),
    offset: String((file - 1) * SITEMAP_STATIONS_PER_FILE),
  });
  const raw = await api<RawStation[]>(`/json/stations/search?${p}`, 86400);
  return raw.filter((s) => s.url_resolved || s.url).map((s) => ({ id: s.stationuuid, name: cleanName(s.name), updated: s.lastchangetime_iso8601 || "" }));
}

export function topStations(limit = 24) {
  return searchStations({ order: "clickcount", limit }, 900);
}

export function trendingStations(limit = 24) {
  return searchStations({ order: "clicktrend", limit }, 900);
}

export async function getCountries(): Promise<Country[]> {
  return remember("countries", 3600, async () => {
    const raw = await api<{ name: string; iso_3166_1: string; stationcount: number }[]>(
      "/json/countries?hidebroken=true",
      86400,
    );
    const byCode = new Map<string, Country>();
    for (const c of raw) {
      const code = (c.iso_3166_1 || "").toUpperCase();
      if (!/^[A-Z]{2}$/.test(code) || c.stationcount < 1) continue;
      const existing = byCode.get(code);
      if (existing) {
        existing.count += c.stationcount;
        continue;
      }
      const name = countryName(code, c.name);
      byCode.set(code, { code, name, slug: slugify(name) || code.toLowerCase(), count: c.stationcount });
    }
    return [...byCode.values()].sort((a, b) => b.count - a.count);
  });
}

export async function getLanguages(): Promise<Language[]> {
  return remember("languages", 3600, async () => {
    const raw = await api<{ name: string; iso_639: string | null; stationcount: number }[]>(
      "/json/languages?hidebroken=true&order=stationcount&reverse=true",
      86400,
    );
    const out: Language[] = [];
    const seen = new Set<string>();
    for (const l of raw) {
      const name = (l.name || "").trim().toLowerCase();
      const slug = nameSlug(name);
      if (!name || l.stationcount < 3 || seen.has(slug)) continue;
      seen.add(slug);
      out.push({ name, label: titleCase(name), slug, count: l.stationcount });
    }
    return out;
  });
}

export async function getGenres(): Promise<Genre[]> {
  return remember("genres", 3600, async () => {
    const raw = await api<{ name: string; stationcount: number }[]>(
      "/json/tags?hidebroken=true&order=stationcount&reverse=true&limit=600",
      86400,
    );
    const out: Genre[] = [];
    const seen = new Set<string>();
    for (const t of raw) {
      const name = (t.name || "").trim().toLowerCase();
      const slug = nameSlug(name);
      // Skip the noise tags that are not a kind of programme.
      if (!name || name.length > 32 || t.stationcount < 8 || seen.has(slug) || /^(radio|fm|am|music|online|internet|live|stereo|webradio|web radio)$/.test(name)) continue;
      seen.add(slug);
      out.push({ name, label: titleCase(name), slug, count: t.stationcount });
    }
    return out;
  });
}

export async function countryBySlug(slug: string): Promise<Country | null> {
  const list = await getCountries();
  const s = slug.toLowerCase();
  return list.find((c) => c.slug === s) ?? list.find((c) => c.code.toLowerCase() === s) ?? null;
}

/** Route params arrive decoded; slugs of names without latin letters are stored encoded. */
function sameSlug(stored: string, param: string): boolean {
  return stored === param || stored === encodeURIComponent(param.toLowerCase());
}

export async function genreBySlug(slug: string): Promise<Genre | null> {
  const list = await getGenres();
  const found = list.find((g) => sameSlug(g.slug, slug));
  if (found) return found;
  // A rarer genre that is not in the top list: shown if the directory has stations for it.
  let name = slug;
  try {
    name = decodeURIComponent(slug);
  } catch {
    /* already decoded */
  }
  name = name.replace(/-/g, " ").trim().toLowerCase();
  if (!name || name.length > 40) return null;
  return { name, label: titleCase(name), slug: nameSlug(name), count: 0 };
}

export async function languageBySlug(slug: string): Promise<Language | null> {
  const list = await getLanguages();
  return list.find((l) => sameSlug(l.slug, slug)) ?? null;
}
