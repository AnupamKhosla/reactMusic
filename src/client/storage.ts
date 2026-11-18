// Favourites, recently played and volume, kept in the visitor's own browser (never sent anywhere).
import type { SavedStation, Station } from "../shared/types.ts";

type Listener = () => void;

function createStore<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  const listeners = new Set<Listener>();
  let cache: T | undefined;

  function read(): T {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : fallback;
      cache = validate(parsed) ? parsed : fallback;
    } catch {
      // Blocked storage (private mode, settings) or a damaged value: start from the default.
      cache = fallback;
    }
    return cache;
  }

  function write(value: T) {
    cache = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode or full: keep it in memory for this tab */
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // Another tab changed it: drop the cached copy and tell this tab.
  window.addEventListener("storage", (e) => {
    if (e.key !== key) return;
    cache = undefined;
    listeners.forEach((l) => l());
  });

  return { read, write, subscribe };
}

const isStationList = (v: unknown): v is SavedStation[] =>
  Array.isArray(v) && v.every((s) => s && typeof s.id === "string" && typeof s.name === "string" && typeof s.stream === "string" && Array.isArray(s.tags));

export const favoritesStore = createStore<SavedStation[]>("lr.favorites", [], isStationList);
export const recentStore = createStore<SavedStation[]>("lr.recent", [], isStationList);
export const volumeStore = createStore<number>("lr.volume", 0.8, (v): v is number => typeof v === "number" && v >= 0 && v <= 1);

export function toSaved(s: Station | SavedStation): SavedStation {
  return {
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
  };
}

export function isFavorite(id: string): boolean {
  return favoritesStore.read().some((s) => s.id === id);
}

/** Adds or removes a station; returns true when it is now a favourite. */
export function toggleFavorite(station: SavedStation): boolean {
  const list = favoritesStore.read();
  if (list.some((s) => s.id === station.id)) {
    favoritesStore.write(list.filter((s) => s.id !== station.id));
    return false;
  }
  favoritesStore.write([toSaved(station), ...list].slice(0, 200));
  return true;
}

export function pushRecent(station: SavedStation) {
  const list = recentStore.read().filter((s) => s.id !== station.id);
  recentStore.write([toSaved(station), ...list].slice(0, 24));
}
