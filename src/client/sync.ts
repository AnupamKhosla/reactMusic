// Puts this visitor's state onto the page: which station is playing, which are favourites, how many favourites.
// The HTML itself is the same for everyone (the Worker can cache it); only these attributes change, so nothing is
// rebuilt when the player or the favourites change.
import type { SavedStation } from "../shared/types.ts";
import { player } from "./player.ts";
import { favoritesStore, recentStore } from "./storage.ts";

/** Every station the visitor can press play on right now: from the pages seen, favourites and recently played. */
const known = new Map<string, SavedStation>();

export function rememberStations(stations: SavedStation[]) {
  for (const s of stations) known.set(s.id, s);
}

export function stationFor(id: string): SavedStation | undefined {
  return known.get(id) ?? favoritesStore.read().find((s) => s.id === id) ?? recentStore.read().find((s) => s.id === id);
}

/** The stations around a card (its grid), for the player's next and previous. */
export function queueFor(button: Element): SavedStation[] {
  const scope = button.closest("[data-queue]");
  if (!scope) return [];
  const ids = [...scope.querySelectorAll<HTMLElement>("[data-card]")].map((el) => el.dataset.card ?? "");
  return [...new Set(ids)].map((id) => stationFor(id)).filter((s): s is SavedStation => s !== undefined);
}

export function syncPage(root: ParentNode = document) {
  const current = player.station?.id ?? null;
  const playing = player.status === "playing";
  const loading = player.status === "loading";

  for (const btn of root.querySelectorAll<HTMLElement>("[data-play]")) {
    const id = btn.dataset.play;
    const name = stationFor(id ?? "")?.name ?? "this station";
    const on = id === current;
    btn.dataset.state = on && playing ? "playing" : on && loading ? "loading" : "";
    btn.setAttribute("aria-pressed", String(on && playing));
    btn.setAttribute("aria-label", on && playing ? `Pause ${name}` : on && loading ? `Stop loading ${name}` : `Play ${name}`);
  }
  for (const card of root.querySelectorAll<HTMLElement>(".station-card")) {
    const on = card.dataset.card === current;
    card.toggleAttribute("data-current", on);
    card.toggleAttribute("data-playing", on && playing);
  }

  const favorites = favoritesStore.read();
  const ids = new Set(favorites.map((s) => s.id));
  for (const btn of document.querySelectorAll<HTMLElement>("[data-fav]")) {
    const id = btn.dataset.fav ?? "";
    const on = ids.has(id);
    const name = stationFor(id)?.name ?? "this station";
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? `Remove ${name} from favourites` : `Add ${name} to favourites`);
  }
  for (const badge of document.querySelectorAll<HTMLElement>("[data-fav-count]")) {
    badge.hidden = favorites.length === 0;
    badge.textContent = favorites.length ? String(favorites.length) : "";
  }
}
